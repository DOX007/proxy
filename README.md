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

`wrangler.toml` sets `ALLOWED_ORIGIN` to `https://proxy-35p.pages.dev`. If the
Pages domain changes, update that value to the exact site origin and deploy
again. A custom proxy endpoint can be configured in the page's **Proxyserver-
inställning** panel if needed.

The endpoint is read-only and accepts HTML pages only. It limits response
size and redirects and rejects local/private IP targets. It does not proxy
JavaScript APIs, downloads, POST forms, or other non-HTML responses. Page
assets are requested directly from the original site, so sites that block
third-party assets may render incompletely.
