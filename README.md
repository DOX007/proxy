# Proxyane

The Cloudflare Pages project serves the static frontend and the proxy endpoint.
`functions/proxy.js` adapts `worker.js` to a Pages Function, so the existing
Git-connected Pages project deploys both together from `main`. Public CORS
relays are not used.

## Deployment

The Pages project should use the repository root (`.`) as its build output
directory, with no build command. Git pushes to the production branch deploy
the frontend and `functions/proxy.js`. The frontend uses its current Pages
origin by default; no separate `workers.dev` service needs to be created.

The Worker allows `https://proxy-35p.pages.dev` and
`https://dox007.github.io` by default, so CORS works even if a Pages
environment variable is not configured. `ALLOWED_ORIGIN` in `wrangler.toml`
can add further comma-separated origins.
The frontend uses the hardcoded Cloudflare Pages endpoint (`defaultProxyEndpoint` in `index.html`)
`https://proxy-35p.pages.dev/proxy`; this also works when opening the frontend
from GitHub Pages. If either domain changes, update `defaultProxyEndpoint` and

The endpoint is read-only and accepts HTML pages only. It limits response
size and redirects and rejects local/private IP targets. It does not proxy
JavaScript APIs, downloads, POST forms, or other non-HTML responses. Page
assets are requested directly from the original site, so sites that block
third-party assets may render incompletely.

## Bilder och stilmallar

Bilder, typsnitt och CSS hämtas via `/asset?url=...` (max 8 MB, SVG och skript blockeras). CSS skrivs om så att `url()` och `@import` också går via proxyn.
