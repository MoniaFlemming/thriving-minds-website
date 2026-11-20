# SEO and static publishing notes

## Canonical domain and launch status

`https://thrivingmindsconsulting.com` is the intended canonical origin supplied
by the site owner; deployment/domain connection has not been verified. It is the
single source default in the SEO configuration, not evidence that the domain is
live. Set `VITE_SITE_ORIGIN` to the final HTTPS origin at build time if it
changes. Do not use a development, preview, or temporary Replit hostname as the
canonical origin.

Set `VITE_GOOGLE_SITE_VERIFICATION` only after receiving the real Search
Console verification token. Leave it unset otherwise. Once the final domain is
connected, verify ownership in Search Console, submit `/sitemap.xml`, and
inspect the homepage and public legal pages. The site does not claim to have
been indexed or verified.

The default social image is `/social-preview.png`; the favicon links are
`/favicon-32.png` and `/apple-touch-icon.png`. Add the approved brand assets at
those paths before launch.

## Routes and prerendering

The build prerenders `/`, `/privacy`, `/terms`, `/accessibility`, and
`/resource-disclaimer`, then validates unique titles/descriptions, canonical
URLs, JSON-LD, robots directives, sitemap membership, and the noindex 404. These
routes must exist in the app and expose `PageMetadata` for the matching
`ssrPath`; missing or failed prerenders stop the build.

Unknown requests are represented by `404.html`, with `noindex, follow` and no
canonical. Static hosts do not all serve `404.html` with an HTTP 404 status:
configure the host's not-found document/response behavior as well. Some hosts
rewrite unknown paths to the app with status 200; that fallback alone does not
provide a true HTTP 404 even though the page metadata remains noindex.

The build emits production crawl files using the configured canonical origin.
The Vite development server serves matching `robots.txt` and `sitemap.xml`, and
marks the HTML shell `noindex, follow`. Do not submit development sitemap
output to search engines.

## App integration contract

Import `PageMetadata` from `@/lib/seo`. Render `<PageMetadata path={path} />`
inside the app shell before the route switch, where `path` is the current
pathname (without a query string). The public legal slugs listed above are the
only standalone pages included in the sitemap; section navigation such as
services, programs, resources, and contact remains on-page anchors.

The prerenderer loads the default export from `src/App.tsx` with
`App({ ssrPath })`. Forward that optional value to Wouter's `Router` as its
`ssrPath` prop so each static route renders its real page. When bootstrapping
the prerendered root, use `hydrateRoot` rather than `createRoot` to preserve the
server-rendered document and avoid replacing it at startup.