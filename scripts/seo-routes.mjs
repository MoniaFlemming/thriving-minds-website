export const PUBLIC_PATHS = [
  '/',
  '/privacy',
  '/terms',
  '/accessibility',
  '/resource-disclaimer',
];

export const SITE_ORIGIN = (
  process.env.VITE_SITE_ORIGIN || 'https://thrivingmindsconsulting.com'
).replace(/\/+$/, '');

export function sitemapXml() {
  const urls = PUBLIC_PATHS.map(
    (route) =>
      `  <url><loc>${SITE_ORIGIN}${route === '/' ? '/' : route}</loc></url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}