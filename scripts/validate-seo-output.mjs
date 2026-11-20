import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PATHS, SITE_ORIGIN } from './seo-routes.mjs';

const outputDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../dist/public',
);
const basePath = `/${(process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}/`.replace(
  /^\/\/$/,
  '/',
);
const checkRemoteImages = process.argv.includes('--check-remote-images');
const remoteImageReferences = new Map();
const remoteImageTimeoutMs = 12_000;
const remoteImageConcurrency = 5;

function getMeta(html, key, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(new RegExp(`<meta\\s+${key}="${escaped}"[^>]*>`, 'i'))?.[0];
  return tag?.match(/\bcontent="([^"]*)"/i)?.[1] ?? null;
}

function getAttributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
      .map(([, name, doubleQuoted, singleQuoted, unquoted]) => [
        name.toLowerCase(),
        doubleQuoted ?? singleQuoted ?? unquoted ?? '',
      ]),
  );
}

function imageUrlsFromTag(tagName, attributes) {
  const urls = [];
  if (tagName === 'img' || tagName === 'source') {
    if (attributes.src) urls.push(attributes.src);
    if (attributes.srcset) {
      for (const candidate of attributes.srcset.split(',')) {
        const url = candidate.trim().split(/\s+/, 1)[0];
        if (url) urls.push(url);
      }
    }
  } else if (tagName === 'link') {
    const rel = (attributes.rel || '').toLowerCase().split(/\s+/);
    if (
      attributes.href &&
      (rel.some((value) => ['icon', 'apple-touch-icon'].includes(value)) ||
        attributes.as?.toLowerCase() === 'image')
    ) {
      urls.push(attributes.href);
    }
  } else if (
    tagName === 'meta' &&
    /^(og:image|og:image:url|twitter:image)$/i.test(
      attributes.property || attributes.name || '',
    ) &&
    attributes.content
  ) {
    urls.push(attributes.content);
  }
  return urls;
}

async function validateImageUrl(value, { htmlFile, pageUrlPath, tagName }) {
  const urlValue = value.replaceAll('&amp;', '&').trim();
  if (!urlValue || /^(?:data|blob):/i.test(urlValue)) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(urlValue, `${SITE_ORIGIN}${pageUrlPath}`);
  } catch {
    assert.fail(`Invalid image URL in ${htmlFile}: ${urlValue}`);
  }
  if (parsedUrl.origin !== SITE_ORIGIN) {
    if (checkRemoteImages && ['http:', 'https:'].includes(parsedUrl.protocol)) {
      parsedUrl.hash = '';
      const remoteUrl = parsedUrl.href;
      const references = remoteImageReferences.get(remoteUrl) ?? new Set();
      references.add(`${pageUrlPath} (<${tagName}>)`);
      remoteImageReferences.set(remoteUrl, references);
    }
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch {
    assert.fail(`Invalid encoded image URL in ${htmlFile}: ${urlValue}`);
  }
  if (basePath !== '/' && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length - 1);
  }
  const imageFile = path.resolve(outputDir, `.${pathname}`);
  const relativePath = path.relative(outputDir, imageFile);
  assert.ok(
    relativePath && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath),
    `Image URL escapes the static build directory in ${htmlFile}: ${urlValue}`,
  );

  let imageStat;
  try {
    imageStat = await stat(imageFile);
  } catch {
    assert.fail(
      `Missing local image in ${htmlFile}: ${urlValue} (referenced by <${tagName}>)`,
    );
  }
  assert.ok(
    imageStat.isFile(),
    `Local image URL does not resolve to a file in ${htmlFile}: ${urlValue}`,
  );
}

async function checkRemoteImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), remoteImageTimeoutMs);
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });

    // Some image hosts do not implement HEAD. A ranged GET checks availability
    // without downloading the complete image when the host honors Range.
    if ([403, 405, 501].includes(response.status)) {
      response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        redirect: 'follow',
        signal: controller.signal,
      });
      await response.body?.cancel().catch(() => {});
    }

    return response.ok ? null : `HTTP ${response.status} ${response.statusText}`.trim();
  } catch (error) {
    if (controller.signal.aborted) {
      return `request timed out after ${remoteImageTimeoutMs / 1000} seconds`;
    }
    return `request failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateRemoteImages() {
  const urls = [...remoteImageReferences.entries()];
  const failures = [];

  for (let start = 0; start < urls.length; start += remoteImageConcurrency) {
    const batch = urls.slice(start, start + remoteImageConcurrency);
    const results = await Promise.all(
      batch.map(async ([url, references]) => ({
        url,
        references: [...references],
        reason: await checkRemoteImage(url),
      })),
    );
    failures.push(...results.filter(({ reason }) => reason));
  }

  if (failures.length) {
    console.error(`Remote image validation failed for ${failures.length} URL(s):`);
    for (const { url, references, reason } of failures) {
      console.error(`- ${url} — ${reason}; referenced by ${references.join(', ')}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Remote image URLs validated: ${urls.length} unique external URL(s).`);
}

async function validateGeneratedHtml(html, { htmlFile, pageUrlPath }) {
  assert.ok(
    !/\/@fs(?:\/|%2f)/i.test(html),
    `Development-only Vite asset path found in ${htmlFile}`,
  );
  const tags = html.matchAll(/<(img|source|link|meta)\b[^>]*>/gi);
  for (const [tag, rawTagName] of tags) {
    const tagName = rawTagName.toLowerCase();
    const attributes = getAttributes(tag);
    for (const imageUrl of imageUrlsFromTag(tagName, attributes)) {
      await validateImageUrl(imageUrl, { htmlFile, pageUrlPath, tagName });
    }
  }
}

function routeOutputPath(route) {
  return route === '/'
    ? path.join(outputDir, 'index.html')
    : path.join(outputDir, route.slice(1), 'index.html');
}

const documents = [];
for (const route of PUBLIC_PATHS) {
  const htmlFile = routeOutputPath(route);
  const html = await readFile(htmlFile, 'utf8');
  await validateGeneratedHtml(html, {
    htmlFile: path.relative(outputDir, htmlFile),
    pageUrlPath: route === '/' ? '/' : `${route}/`,
  });
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim();
  const description = getMeta(html, 'name', 'description');
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  assert.ok(title, `Missing title on ${route}`);
  assert.ok(description, `Missing description on ${route}`);
  assert.ok(canonical, `Missing canonical on ${route}`);
  assert.equal(canonical, `${SITE_ORIGIN}${route === '/' ? '/' : route}`, `Wrong canonical on ${route}`);
  assert.equal(getMeta(html, 'name', 'robots'), 'index, follow', `Unexpected robots directive on ${route}`);
  assert.ok(html.includes('id="root"><'), `Static route has no rendered React content: ${route}`);
  const payload = html.match(
    /<script type="application\/x-thriving-minds-seo"[^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  assert.ok(payload, `Hydration metadata payload missing on ${route}`);
  assert.equal(JSON.parse(payload).path, route, `Wrong hydration metadata payload on ${route}`);
  assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1|[^/"\s]+\.replit\.(?:dev|app))/i.test(html), `Development URL leaked into ${route}`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(
    ([, json]) => JSON.parse(json),
  );
  assert.ok(schemas.some((schema) => schema['@type'] === 'Organization'), `Organization schema missing on ${route}`);
  assert.ok(schemas.some((schema) => schema['@type'] === 'WebPage'), `WebPage schema missing on ${route}`);
  assert.ok(
    schemas.filter((schema) => schema['@type'] === 'WebPage').every((schema) => schema.url === canonical),
    `WebPage schema URL does not match canonical on ${route}`,
  );
  if (route === '/') {
    assert.ok(schemas.some((schema) => schema['@type'] === 'WebSite'), 'WebSite schema missing on home');
    assert.ok(schemas.some((schema) => schema['@type'] === 'Service'), 'Service schema missing on home');
  } else {
    assert.ok(!schemas.some((schema) => schema['@type'] === 'Service'), `Unexpected Service schema on ${route}`);
  }
  documents.push({ route, title, description });
}
assert.equal(new Set(documents.map(({ title }) => title)).size, PUBLIC_PATHS.length, 'Public page titles must be unique');
assert.equal(new Set(documents.map(({ description }) => description)).size, PUBLIC_PATHS.length, 'Public descriptions must be unique');

const notFoundFile = path.join(outputDir, '404.html');
const notFound = await readFile(notFoundFile, 'utf8');
await validateGeneratedHtml(notFound, {
  htmlFile: '404.html',
  pageUrlPath: '/',
});
assert.equal(getMeta(notFound, 'name', 'robots'), 'noindex, follow', 'Unknown route must be noindex');
assert.ok(!/<link\s+rel="canonical"/i.test(notFound), 'Unknown route must not have a canonical URL');
const notFoundPayload = notFound.match(
  /<script type="application\/x-thriving-minds-seo"[^>]*>([\s\S]*?)<\/script>/i,
)?.[1];
assert.ok(notFoundPayload, 'Hydration metadata payload missing on static 404');
assert.equal(JSON.parse(notFoundPayload).robots, 'noindex, follow');
assert.ok(notFound.includes('id="root"><'), 'Static 404 has no rendered content');

const sitemap = await readFile(path.join(outputDir, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url);
assert.deepEqual(
  sitemapUrls,
  PUBLIC_PATHS.map((route) => `${SITE_ORIGIN}${route === '/' ? '/' : route}`),
  'Sitemap must contain only the five intended public pages in route order',
);
assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1|[^/"\s]+\.replit\.(?:dev|app))/i.test(sitemap), 'Development URL leaked into sitemap');
assert.ok(
  (await readFile(path.join(outputDir, 'robots.txt'), 'utf8')).includes(`${SITE_ORIGIN}/sitemap.xml`),
  'robots.txt must reference the canonical sitemap',
);
if (checkRemoteImages) await validateRemoteImages();
console.log(`SEO output validated: ${PUBLIC_PATHS.length} public routes and noindex 404.`);