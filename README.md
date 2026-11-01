# Proxyane

Webbproxy som körs helt på Cloudflare Pages: `index.html` är gränssnittet och
`functions/proxy.js` + `functions/asset.js` är Pages Functions som använder
logiken i `worker.js`. Allt deployas automatiskt från `main`.

## Adresser

- Cloudflare Pages: `https://proxy-35p.pages.dev`
- GitHub Pages: `https://dox007.github.io/proxy/` (använder samma proxy)
- Proxyadressen är hårdkodad som `defaultProxyEndpoint` i `index.html`.
- Deploy-URL:er med en hash i början av värdnamnet är versionsspecifika.
  Använd den permanenta adressen `https://proxy-35p.pages.dev`.
- Proxy-endpointen tillåter CORS-anrop från webbläsare på valfri origin, utan
  cookies eller inloggning. Åtkomst begränsas av GET-only-regler och validering
  som blockerar privata/lokala mål.

## Endpoints

- `/proxy?url=...` – hämtar HTML-sidor (max 3 MB, max 5 omdirigeringar, 10 s).
  Skickar `Access-Control-Allow-Origin: *`; begäran använder inte cookies eller
  inloggningsuppgifter.
- `/asset?url=...` – hämtar bilder, typsnitt och CSS (max 8 MB). CSS skrivs om
  så att `url()` och `@import` också går via proxyn. SVG och skript blockeras.
- `/health` – returnerar `ok`.

Lokala/privata adresser och IPv6 nekas. Endast GET stöds.

## Deployment

Pages-projektet använder repots rot (`.`) som output och inget byggkommando.

## Begränsningar

Skript, API-anrop och POST-formulär går inte via proxyn. Tunga JavaScript-sidor
(t.ex. temu.com) eller sidor med botskydd kan därför bli tomma.
