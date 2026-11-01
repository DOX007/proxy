const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 5;
function corsHeaders() {
  const headers = new Headers({
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400'
  });
  return headers;
}

function reply(request, env, body, status, contentType = 'text/plain; charset=utf-8') {
  const headers = corsHeaders();
  headers.set('Content-Type', contentType);
  return new Response(body, { status, headers });
}

function validateTarget(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Ogiltig måladress.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Endast HTTP/HTTPS-adresser utan inloggningsuppgifter stöds.');
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || /\.(localhost|local|internal|test)$/.test(host) ||
      host.includes(':')) {
    throw new Error('Lokala värdnamn och IPv6-adresser tillåts inte.');
  }

  const octets = host.split('.');
  if (octets.length === 4 && octets.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)) {
    const [a, b, c] = octets.map(Number);
    const privateAddress = a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113);
    if (privateAddress) throw new Error('Privata eller reserverade IP-adresser tillåts inte.');
  }

  return url;
}

async function readHtml(response) {
  const contentType = response.headers.get('Content-Type') || '';
  if (!/^text\/html\b|^application\/xhtml\+xml\b/i.test(contentType)) {
    throw new Error('Målsidan svarade inte med HTML.');
  }

  const declaredSize = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_HTML_BYTES) {
    throw new Error('HTML-sidan är större än 3 MB.');
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error('HTML-sidan är större än 3 MB.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchTarget(target) {
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Proxyane-Web-Proxy/1.0' }
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('Location');
    if (!location) return response;
    if (redirects === MAX_REDIRECTS) throw new Error('Målsidan omdirigerade för många gånger.');
    await response.body?.cancel();
    target = validateTarget(new URL(location, target).href);
  }
  throw new Error('Omdirigeringen kunde inte slutföras.');
}

function assetUrl(base, value, origin) {
  try {
    const abs = new URL(value, base);
    if (!['http:', 'https:'].includes(abs.protocol)) return null;
    return `${origin}/asset?url=${encodeURIComponent(abs.href)}`;
  } catch {
    return null;
  }
}

function rewriteCss(css, base, origin) {
  return css
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, value) => {
      if (/^data:/i.test(value.trim())) return match;
      const next = assetUrl(base, value.trim(), origin);
      return next ? `url("${next}")` : match;
    })
    .replace(/@import\s+(["'])([^"']+)\1/gi, (match, quote, value) => {
      const next = assetUrl(base, value.trim(), origin);
      return next ? `@import "${next}"` : match;
    });
}

async function handleAsset(request, url) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600'
  });
  const tooLarge = () => new Response('Resursen är för stor.', { status: 413, headers });
  try {
    const target = validateTarget(url.searchParams.get('url') || '');
    const upstream = await fetchTarget(target);
    const type = (upstream.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    const isCss = type === 'text/css';
    // SVG utesluts eftersom den kan innehålla skript
    const isMedia = /^(image\/(?!svg)|font\/|application\/(x-)?font|application\/vnd\.ms-fontobject)/.test(type);
    if (!isCss && !isMedia) {
      await upstream.body?.cancel();
      return new Response('Resurstypen tillåts inte.', { status: 415, headers });
    }
    const declared = Number(upstream.headers.get('Content-Length'));
    if (Number.isFinite(declared) && declared > MAX_ASSET_BYTES) {
      await upstream.body?.cancel();
      return tooLarge();
    }
    if (isCss) {
      const css = await upstream.text();
      if (css.length > MAX_ASSET_BYTES) return tooLarge();
      headers.set('Content-Type', 'text/css; charset=utf-8');
      return new Response(rewriteCss(css, upstream.url || target.href, new URL(request.url).origin), { status: upstream.status, headers });
    }
    headers.set('Content-Type', type);
    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_ASSET_BYTES) return tooLarge();
    return new Response(buffer, { status: upstream.status, headers });
  } catch (error) {
    return new Response(error.message || 'Kunde inte hämta resursen.', { status: 502, headers });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Bilder, stilmallar och typsnitt laddas av iframen utan Origin-header
    if (request.method === 'GET' && url.pathname === '/asset') {
      return handleAsset(request, url);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== 'GET') return reply(request, env, 'Endast GET tillåts.', 405);
    if (url.pathname === '/health') return reply(request, env, 'ok', 200);
    if (url.pathname !== '/proxy') return reply(request, env, 'Okänd sökväg.', 404);

    try {
      const target = validateTarget(url.searchParams.get('url') || '');
      const upstream = await fetchTarget(target);
      const html = await readHtml(upstream);
      return reply(request, env, html, upstream.status, 'text/html; charset=utf-8');
    } catch (error) {
      return reply(request, env, error.message || 'Kunde inte hämta målsidan.', 502);
    }
  }
};
