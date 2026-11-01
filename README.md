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

`wrangler.toml` declares both `https://proxy-35p.pages.dev` and
`https://dox007.github.io`, the Cloudflare Pages and GitHub Pages origins.
The frontend defaults to the Cloudflare Pages endpoint
`https://proxy-35p.pages.dev/proxy`; this also works when opening the frontend
from GitHub Pages. If either domain changes, update `ALLOWED_ORIGIN` to the
comma-separated exact origins and deploy again. A custom proxy endpoint can
be configured in the page's **Proxyserver-inställning** panel if needed.

For a Git-connected Cloudflare Pages project, also add the Pages Function
environment variable in the Cloudflare dashboard: **Workers & Pages → proxy →
Settings → Variables and Secrets → Production**. Set `ALLOWED_ORIGIN` to
`https://proxy-35p.pages.dev,https://dox007.github.io`, then trigger a new
production deployment. If the variable is missing, browser requests from
either site are rejected by CORS and show `Failed to fetch`.

The endpoint is read-only and accepts HTML pages only. It limits response
size and redirects and rejects local/private IP targets. It does not proxy
JavaScript APIs, downloads, POST forms, or other non-HTML responses. Page
assets are requested directly from the original site, so sites that block
third-party assets may render incompletely.
