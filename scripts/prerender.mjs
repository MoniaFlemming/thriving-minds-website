import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { PUBLIC_PATHS, SITE_ORIGIN, robotsTxt, sitemapXml } from './seo-routes.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(projectDir, 'dist/public');
// Vite's SSR loader uses a dev server internally, but these renders belong to
// the production build. Set the production environment before creating it so
// import.meta.env.PROD and the crawl metadata agree with the emitted bundle.
process.env.NODE_ENV = 'production';
const vite = await createServer({
  configFile: path.join(projectDir, 'vite.config.ts'),
  configFileDependencies: 'eager',
  mode: 'production',
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setMeta(html, selectorAttribute, selectorValue, content) {
  const escapedAttribute = selectorAttribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = selectorValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<meta\\s+${escapedAttribute}="${escapedValue}"[^>]*>`,
    'i',
  );
  const tag = `<meta ${selectorAttribute}="${selectorValue}" content="${escapeAttribute(content)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace('</head>', `    ${tag}\n  </head>`);
}

function updateHead(shell, metadata) {
  let html = shell.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttribute(metadata.title)}</title>`,
  );
  html = setMeta(html, 'name', 'description', metadata.description);
  html = setMeta(html, 'name', 'robots', metadata.robots);
  html = setMeta(html, 'property', 'og:site_name', 'Thriving Minds Consulting');
  html = setMeta(html, 'property', 'og:title', metadata.title);
  html = setMeta(html, 'property', 'og:description', metadata.description);
  html = setMeta(html, 'property', 'og:type', 'website');
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', metadata.title);
  html = setMeta(html, 'name', 'twitter:description', metadata.description);
  html = setMeta(
    html,
    'property',
    'og:image',
    `${SITE_ORIGIN}/social-preview.png`,
  );
  html = setMeta(
    html,
    'name',
    'twitter:image',
    `${SITE_ORIGIN}/social-preview.png`,
  );
  if (metadata.canonical) {
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"[^>]*>/i,
      `<link rel="canonical" href="${escapeAttribute(metadata.canonical)}" />`,
    );
    html = setMeta(html, 'property', 'og:url', metadata.canonical);
  } else {
    html = html
      .replace(/<link\s+rel="canonical"[^>]*>/gi, '')
      .replace(/<meta\s+property="og:url"[^>]*>/gi, '');
  }
  const schemas = metadata.structuredData
    .map(
      (schema) =>
        `    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`,
    )
    .join('\n');
  return html.replace('</head>', `${schemas}\n  </head>`);
}

async function renderRoute(App, shell, route) {
  const rendered = renderToString(React.createElement(App, { ssrPath: route }));
  const payload = rendered.match(
    /<script type="application\/x-thriving-minds-seo"[^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  assert.ok(payload, `PageMetadata payload was not rendered for ${route}`);
  const metadata = JSON.parse(payload);
  assert.equal(metadata.path, route, `App router did not render the requested path ${route}`);
  const body = rendered;
  assert.ok(/<h1(?:\s|>)/i.test(body), `Static route ${route} must render a page heading`);
  const html = updateHead(shell, metadata).replace(
    '<div id="root"></div>',
    `<div id="root">${body}</div>`,
  );
  assert.ok(!html.includes('id="root"></div>'), `React content missing for ${route}`);
  return { html, metadata };
}

try {
  const appModule = await vite.ssrLoadModule('/src/App.tsx');
  const App = appModule.default;
  assert.equal(typeof App, 'function', 'Expected default App export for prerender');
  const shell = await readFile(path.join(outputDir, 'index.html'), 'utf8');

  for (const route of PUBLIC_PATHS) {
    const { html, metadata } = await renderRoute(App, shell, route);
    assert.equal(metadata.robots, 'index, follow', `Public route is unexpectedly noindex: ${route}`);
    const file = route === '/'
      ? path.join(outputDir, 'index.html')
      : path.join(outputDir, route.slice(1), 'index.html');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);
  }

  const { html: notFound } = await renderRoute(App, shell, '/__seo_prerender_unknown__');
  const notFoundPayload = notFound.match(
    /<meta\s+name="robots"\s+content="([^"]+)"/i,
  )?.[1];
  assert.equal(notFoundPayload, 'noindex, follow', 'Unknown routes must be noindex');
  await writeFile(path.join(outputDir, '404.html'), notFound);
  await writeFile(path.join(outputDir, 'robots.txt'), robotsTxt());
  await writeFile(path.join(outputDir, 'sitemap.xml'), sitemapXml());
} finally {
  await vite.close();
}

await import('./validate-seo-output.mjs');
console.log('Static SEO pages generated for the canonical intended domain.');