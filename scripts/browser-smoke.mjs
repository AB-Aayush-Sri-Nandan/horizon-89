import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.H89_BROWSER_BASE_URL || 'http://127.0.0.1:5173';
const chromium = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const debugPort = 9333;
const response = await fetch(base).catch(() => null);
if (!response?.ok) throw new Error(`Start the application with npm run dev before browser tests (${base} unavailable).`);
const browser = spawn(chromium, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', `--remote-debugging-port=${debugPort}`, '--user-data-dir=/tmp/h89-browser-smoke', 'about:blank'], { stdio: 'ignore' });
async function waitForBrowser() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const status = await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => null);
    if (status?.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Chromium did not start.');
}
async function capture(width, height, filename, hash = 'home') {
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${base}/#${hash}`)}`, { method: 'PUT' }).then((value) => value.json());
  const socket = new WebSocket(created.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const resolver = pending.get(message.id);
    if (resolver) { pending.delete(message.id); resolver(message); }
  };
  const send = (method, params = {}) => {
    const requestId = ++id;
    socket.send(JSON.stringify({ id: requestId, method, params }));
    return new Promise((resolve) => pending.set(requestId, resolve));
  };
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Page.enable');
  await send('Page.navigate', { url: `${base}/#${hash}` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const inspection = await send('Runtime.evaluate', { expression: `JSON.stringify({asset:document.querySelector('.hero-scene img')?.getAttribute('src'),title:document.querySelector('#hero-title')?.textContent,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,missionCount:document.querySelectorAll('.mission-roster > button').length,marker:Boolean(document.querySelector('.mission-marker')),copilotLabels:[...document.querySelectorAll('body *')].filter(e=>e.children.length===0).map(e=>e.textContent).filter(t=>t?.includes('Horizon Intelligence')).length})`, returnByValue: true });
  const state = JSON.parse(inspection.result.result.value);
  if (state.overflow) throw new Error(`Horizontal overflow at #${hash}: ${JSON.stringify(state)}`);
  if (hash === 'home' && (state.asset !== '/horizon89-lunar-base.svg' || !state.title?.includes('HORIZON 89'))) throw new Error(`Homepage browser assertion failed: ${JSON.stringify(state)}`);
  if (hash === 'control' && (state.missionCount < 10 || !state.marker)) throw new Error(`Mission Control assertion failed: ${JSON.stringify(state)}`);
  if (hash === 'copilot' && state.copilotLabels) throw new Error(`Legacy AI name remains visible: ${JSON.stringify(state)}`);
  if (hash === 'control') {
    await send('Runtime.evaluate', { expression: `document.querySelectorAll('.mission-roster > button')[1].click()` });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const blueGhost = await send('Runtime.evaluate', { expression: `JSON.stringify({name:document.querySelector('.map-coordinates strong')?.textContent,coordinate:document.querySelector('.map-coordinates span')?.textContent,marker:Boolean(document.querySelector('.mission-marker'))})`, returnByValue: true });
    const blueGhostState = JSON.parse(blueGhost.result.result.value);
    if (blueGhostState.name !== 'Blue Ghost Mission 1' || !blueGhostState.coordinate?.includes('18.56') || !blueGhostState.marker) throw new Error(`Mission selection did not update map: ${JSON.stringify(blueGhostState)}`);
    await send('Runtime.evaluate', { expression: `document.querySelectorAll('.mission-roster > button')[3].click()` });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const peregrine = await send('Runtime.evaluate', { expression: `JSON.stringify({name:document.querySelector('.map-coordinates strong')?.textContent,marker:Boolean(document.querySelector('.mission-marker')),empty:document.querySelector('.map-empty')?.textContent})`, returnByValue: true });
    const peregrineState = JSON.parse(peregrine.result.result.value);
    if (peregrineState.name !== 'Peregrine Mission One' || peregrineState.marker || !peregrineState.empty?.includes('did not land')) throw new Error(`No-landing state failed: ${JSON.stringify(peregrineState)}`);
    await send('Runtime.evaluate', { expression: `document.querySelectorAll('.mission-roster > button')[0].click()` });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(filename, Buffer.from(shot.result.data, 'base64'));
  await send('Page.close');
  socket.close();
}
try {
  await waitForBrowser();
  await mkdir('docs/screenshots', { recursive: true });
  await capture(1440, 1000, 'docs/screenshots/home-lunar-desktop.png');
  await capture(390, 844, 'docs/screenshots/home-lunar-mobile.png');
  await capture(1440, 1000, 'docs/screenshots/mission-control.png', 'control');
  await capture(390, 844, 'docs/screenshots/mobile-mission-control.png', 'control');
  await capture(1200, 900, 'docs/screenshots/mission-copilot.png', 'copilot');
  process.stdout.write('Homepage, Mission Control, and single-Copilot desktop/mobile browser checks passed.\n');
} finally {
  browser.kill('SIGTERM');
}
