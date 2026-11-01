# Proxyane

The GitHub Pages frontend uses a Cloudflare Worker to fetch HTML. Public CORS
relays are not used. The Worker is intentionally read-only, accepts HTML only,
limits response size and redirects, and rejects local/private IP targets.

## Deploy the Worker

1. Install Wrangler and sign in to your Cloudflare account:

   ```sh
   npm install --global wrangler
   wrangler login
   ```

2. From the repository directory, deploy the Worker:

   ```sh
   wrangler deploy
   ```

3. Copy the `workers.dev` URL printed by Wrangler. In Proxyane, open
   **Cloudflare Worker-inställning**, enter that HTTPS origin, and save it.
   The frontend stores this setting in the current browser.

The default allowed frontend origin is `https://dox007.github.io`, which is
the origin used by this repository's GitHub Pages site. If you host the page
elsewhere, update `ALLOWED_ORIGIN` in `wrangler.toml` to the exact origin,
including the scheme and without a trailing path, then deploy again.

The Worker supports GET requests for HTML pages only. It does not proxy
JavaScript APIs, downloads, POST forms, or other non-HTML responses. Page
assets are requested directly from the original site, so sites that block
third-party assets may render incompletely.
