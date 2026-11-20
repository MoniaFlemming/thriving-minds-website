import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PATHS } from './seo-routes.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectDir, 'dist/public');
const basePath = `/${(process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}/`.replace(
  /^\/\/$/,
  '/',
);
const basePrefix = basePath === '/' ? '' : basePath.slice(0, -1);
const chromiumPath = process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium';
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

try {
  await access(path.join(outputDir, 'index.html'));
  await access(chromiumPath);
} catch {
  assert.fail(
    `Browser image validation needs a built site and Chromium. Run the build first or set CHROMIUM_PATH. Expected build: ${outputDir}; Chromium: ${chromiumPath}`,
  );
}

const routesJson = JSON.stringify(PUBLIC_PATHS);
const basePrefixJson = JSON.stringify(basePrefix);
const browserHarness = `<!doctype html>
<meta charset="utf-8">
<title>Local image check</title>
<pre id="image-test-results" data-result="">Running browser image check…</pre>
<iframe id="page" title="Page under test" style="position:fixed;left:0;top:0;width:1280px;height:800px;border:0;opacity:.01"></iframe>
<script>
(() => {
  const routes = ${routesJson};
  const basePrefix = ${basePrefixJson};
  const frame = document.querySelector('#page');
  const result = document.querySelector('#image-test-results');
  const pageUrl = (route) => basePrefix + (route === '/' ? '/' : route + '/');
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  async function openRoute(route) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out loading ' + route)), 15000);
      frame.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      frame.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Could not open ' + route));
      };
      frame.src = pageUrl(route);
    });
  }

  async function waitForImage(image) {
    if (image.complete) return;
    await Promise.race([
      new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }),
      wait(12000),
    ]);
  }

  async function checkRoute(route) {
    await openRoute(route);
    await wait(150);
    const page = frame.contentWindow;
    const images = [...frame.contentDocument.images];
    const localImages = images.filter((image) => {
      const source = image.currentSrc || image.src;
      return source && new URL(source, frame.contentDocument.baseURI).origin === location.origin;
    });
    const pageHeight = Math.max(
      frame.contentDocument.documentElement.scrollHeight,
      frame.contentDocument.body.scrollHeight,
    );

    for (let top = 0; top < pageHeight; top += Math.max(300, page.innerHeight * 0.7)) {
      page.scrollTo(0, top);
      await wait(100);
    }
    page.scrollTo(0, pageHeight);
    await wait(150);

    const failures = [];
    for (const image of localImages) {
      image.scrollIntoView({ block: 'center' });
      await waitForImage(image);
      try {
        await image.decode();
      } catch {
        // A decode rejection is reported below with the failed image URL.
      }
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        failures.push(image.currentSrc || image.src);
      }
    }
    return { route, localImageCount: localImages.length, failures };
  }

  (async () => {
    const pages = [];
    for (const route of routes) pages.push(await checkRoute(route));
    const report = { pages, failures: pages.flatMap(({ route, failures }) =>
      failures.map((url) => ({ route, url })),
    ) };
    result.textContent = JSON.stringify(report);
    result.dataset.result = encodeURIComponent(JSON.stringify(report));
  })().catch((error) => {
    const report = { error: error.stack || String(error) };
    result.textContent = JSON.stringify(report);
    result.dataset.result = encodeURIComponent(JSON.stringify(report));
  });
})();
</script>`;

function routeOutputPath(route) {
  return route === '/'
    ? path.join(outputDir, 'index.html')
    : path.join(outputDir, route.slice(1), 'index.html');
}

function isWithinDirectory(directory, filePath) {
  const relative = path.relative(directory, filePath);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if (requestPath === '/__image-check') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(browserHarness);
      return;
    }

    let relativePath = requestPath;
    if (basePrefix && relativePath.startsWith(`${basePrefix}/`)) {
      relativePath = relativePath.slice(basePrefix.length);
    } else if (basePrefix && relativePath === basePrefix) {
      relativePath = '/';
    }
    let filePath;
    if (relativePath === '/' || relativePath.endsWith('/')) {
      const route = relativePath.replace(/\/+$/, '') || '/';
      filePath = routeOutputPath(route);
    } else {
      filePath = path.resolve(outputDir, `.${decodeURIComponent(relativePath)}`);
    }

    if (!isWithinDirectory(outputDir, filePath)) {
      response.writeHead(400).end('Invalid path');
      return;
    }
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat?.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(400).end('Invalid request');
  }
});

const profileDir = await mkdtemp(path.join(os.tmpdir(), 'thriving-minds-image-check-'));
let browser;
let connection;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const browserPortServer = net.createServer();
  await new Promise((resolve, reject) => {
    browserPortServer.once('error', reject);
    browserPortServer.listen(0, '127.0.0.1', resolve);
  });
  const browserPort = browserPortServer.address().port;
  await new Promise((resolve) => browserPortServer.close(resolve));
  const { port } = server.address();
  browser = spawn(
    chromiumPath,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--no-first-run',
      '--remote-allow-origins=*',
      `--remote-debugging-port=${browserPort}`,
      `--user-data-dir=${profileDir}`,
    ],
    { stdio: 'ignore' },
  );

  let browserEndpoint;
  const startupDeadline = Date.now() + 15000;
  while (!browserEndpoint && Date.now() < startupDeadline) {
    if (browser.exitCode !== null) {
      throw new Error(`Chromium exited during startup with code ${browser.exitCode}.`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${browserPort}/json/version`);
      if (response.ok) browserEndpoint = (await response.json()).webSocketDebuggerUrl;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(browserEndpoint, 'Chromium remote debugging endpoint did not start.');

  const targetResponse = await fetch(`http://127.0.0.1:${browserPort}/json/list`);
  const target = (await targetResponse.json()).find((entry) => entry.type === 'page');
  assert.ok(target?.webSocketDebuggerUrl, 'Chromium did not expose a browser page.');
  connection = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    connection.addEventListener('open', resolve, { once: true });
    connection.addEventListener('error', reject, { once: true });
  });

  let nextCommandId = 0;
  const pendingCommands = new Map();
  connection.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
  });
  const sendCommand = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextCommandId;
    pendingCommands.set(id, { resolve, reject });
    connection.send(JSON.stringify({ id, method, params }));
  });
  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Page.navigate', {
    url: `http://127.0.0.1:${port}/__image-check`,
  });

  let encodedReport;
  const testDeadline = Date.now() + 110000;
  while (!encodedReport && Date.now() < testDeadline) {
    const evaluation = await sendCommand('Runtime.evaluate', {
      expression: "document.querySelector('#image-test-results')?.dataset.result || ''",
      returnByValue: true,
    });
    encodedReport = evaluation.result?.value;
    if (!encodedReport) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(encodedReport, 'Chromium did not finish the browser image check within 110 seconds.');
  const report = JSON.parse(decodeURIComponent(encodedReport));
  assert.ok(!report.error, `Browser image check failed: ${report.error || ''}`);
  for (const page of report.pages) {
    assert.ok(page.localImageCount > 0, `No local images were checked on ${page.route}`);
  }
  assert.deepEqual(report.failures, [], `Local images failed to load:\n${JSON.stringify(report.failures, null, 2)}`);
  console.log(
    `Browser image check passed: ${report.pages.length} public pages, ${report.pages.reduce((total, page) => total + page.localImageCount, 0)} local image elements.`,
  );
} finally {
  connection?.close();
  if (browser && browser.exitCode === null) {
    browser.kill('SIGTERM');
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      browser.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  await new Promise((resolve) => server.close(resolve));
  await rm(profileDir, { recursive: true, force: true });
}
