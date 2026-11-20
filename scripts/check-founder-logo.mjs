import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const baseUrl = process.env.FOUNDER_LOGO_TEST_URL
  ?? `http://127.0.0.1:${process.env.PORT || '24288'}/`;
const chromiumPath = process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium';
const viewports = [
  { name: 'mobile', width: 375, height: 812, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];
const profileDir = await mkdtemp(path.join(tmpdir(), 'founder-logo-check-'));
const browser = spawn(chromiumPath, [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  'about:blank',
], { stdio: 'ignore' });

let debugPort;
let nextCommandId = 0;

async function waitForDebugPort() {
  const activePortFile = path.join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (browser.exitCode !== null) {
      throw new Error(`Chromium exited before starting (code ${browser.exitCode}).`);
    }
    try {
      const [port] = (await readFile(activePortFile, 'utf8')).split('\n');
      if (port) return Number(port);
    } catch {
      // Chromium has not created its debugging endpoint yet.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for Chromium to start.');
}

async function connectToPage(viewport) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error(`Chromium could not open a page (${response.status}).`);
  }
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const failedImageRequests = new Set();
  const badImageResponses = new Set();
  const eventWaiters = new Map();

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chromium.')), { once: true });
  });

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }

    if (message.method === 'Network.requestWillBeSent') {
      const { requestId, request } = message.params;
      if (request.url.includes('founder-logo.png')) {
        message.params.type === 'Image' && imageRequests.set(requestId, request.url);
      }
    }
    if (message.method === 'Network.loadingFailed') {
      const url = imageRequests.get(message.params.requestId);
      if (url) failedImageRequests.add(url);
    }
    if (message.method === 'Network.responseReceived') {
      const { requestId, response: imageResponse } = message.params;
      if (imageRequests.has(requestId) && imageResponse.status >= 400) {
        badImageResponses.add(`${imageResponse.status} ${imageResponse.url}`);
      }
    }
    const waiters = eventWaiters.get(message.method);
    if (waiters?.length) waiters.shift()();
  });

  const imageRequests = new Map();
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextCommandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const waitForEvent = method => new Promise(resolve => {
    const waiters = eventWaiters.get(method) ?? [];
    waiters.push(resolve);
    eventWaiters.set(method, waiters);
  });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
    }
    return result.result.value;
  };

  await command('Page.enable');
  await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await command('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile });
  const loaded = waitForEvent('Page.loadEventFired');
  await command('Page.navigate', { url: baseUrl });
  await loaded;

  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 30000;
    const findFounder = () => {
      const section = document.querySelector('#founder');
      const image = section?.querySelector('.founder-portrait');
      if (section && image) {
        section.scrollIntoView({ block: 'center', behavior: 'instant' });
        image.addEventListener('load', () => resolve(true), { once: true });
        image.addEventListener('error', () => reject(new Error('Founder logo image failed to load.')), { once: true });
        if (image.complete) {
          if (image.naturalWidth > 0) resolve(true);
          else reject(new Error('Founder logo completed with no image data.'));
        }
        return;
      }
      if (Date.now() >= deadline) reject(new Error('Founder section did not render.'));
      else setTimeout(findFounder, 100);
    };
    findFounder();
  })`);

  const layout = await evaluate(`(() => {
    const section = document.querySelector('#founder');
    const image = section.querySelector('.founder-portrait');
    const lockup = image.closest('.founder-brand-lockup');
    const rect = element => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    return {
      source: image.currentSrc,
      loaded: image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      naturalWidth: image.naturalWidth,
      image: rect(image),
      lockup: rect(lockup),
      section: rect(section),
      viewportWidth: window.innerWidth,
    };
  })()`);

  const failures = [];
  if (!layout.loaded) failures.push('the founder logo did not load');
  if (layout.naturalWidth < 100) failures.push('the founder logo has an unexpectedly small source image');
  if (layout.image.width < 60) failures.push('the founder logo is too small to remain legible');
  if (layout.image.left < -1 || layout.image.right > layout.viewportWidth + 1) {
    failures.push('the founder logo extends beyond the viewport');
  }
  if (
    layout.image.left < layout.lockup.left - 1
    || layout.image.right > layout.lockup.right + 1
    || layout.image.top < layout.lockup.top - 1
    || layout.image.bottom > layout.lockup.bottom + 1
    || layout.image.left < layout.section.left - 1
    || layout.image.right > layout.section.right + 1
  ) {
    failures.push('the founder logo extends beyond its intended layout');
  }
  if (failedImageRequests.size || badImageResponses.size) {
    failures.push(
      `founder logo request failed: ${[...failedImageRequests, ...badImageResponses].join(', ')}`,
    );
  }

  socket.close();
  if (failures.length) {
    throw new Error(`${viewport.name} (${viewport.width}px): ${failures.join('; ')}. Layout: ${JSON.stringify(layout)}`);
  }
  console.log(
    `PASS ${viewport.name} ${viewport.width}px: image loaded (${layout.naturalWidth}px source), rendered at ${Math.round(layout.image.width)}px within its lockup.`,
  );
}

try {
  debugPort = await waitForDebugPort();
  for (const viewport of viewports) await connectToPage(viewport);
} finally {
  browser.kill('SIGTERM');
  await rm(profileDir, { recursive: true, force: true });
}
