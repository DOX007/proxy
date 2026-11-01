# Proxyane

Webbproxy som körs helt på Cloudflare Pages: `index.html` är gränssnittet och
`functions/proxy.js` + `functions/asset.js` är Pages Functions som använder
logiken i `worker.js`. Allt deployas automatiskt från `main`.

## Adresser

- Cloudflare Pages: `https://proxy-35p.pages.dev`
- GitHub Pages: `https://dox007.github.io/proxy/` (använder samma proxy)
- Proxyadressen är hårdkodad som `defaultProxyEndpoint` i `index.html`.
- Tillåtna origins finns i `DEFAULT_ALLOWED_ORIGINS` i `worker.js` och
  `ALLOWED_ORIGIN` i `wrangler.toml`. Byts en domän måste alla tre uppdateras.

## Endpoints

- `/proxy?url=...` – hämtar HTML-sidor (max 3 MB, max 5 omdirigeringar, 10 s).
  Kräver en tillåten origin.
- `/asset?url=...` – hämtar bilder, typsnitt och CSS (max 8 MB). CSS skrivs om
  så att `url()` och `@import` också går via proxyn. SVG och skript blockeras.
- `/health` – returnerar `ok`.

Lokala/privata adresser och IPv6 nekas. Endast GET stöds.

## Deployment

Pages-projektet använder repots rot (`.`) som output och inget byggkommando.

## Begränsningar

Skript, API-anrop och POST-formulär går inte via proxyn. Tunga JavaScript-sidor
(t.ex. temu.com) eller sidor med botskydd kan därför bli tomma.
