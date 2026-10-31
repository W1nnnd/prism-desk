// Headless smoke test: loads the dev server (run `npm run dev:runtime` first)
// in Chrome with the IWER emulator, checks the HUD rendered and no page errors,
// and saves a screenshot. Requires `playwright-core` (npm i -D playwright-core)
// and a local Chrome at CHROME_PATH (default /usr/bin/google-chrome).
import { chromium } from 'playwright-core';

const url = process.env.SMOKE_URL ?? 'https://localhost:8081/';
const out = process.env.SMOKE_SHOT ?? '../docs/screenshots/skeleton_desktop.png';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(15000);
await page.screenshot({ path: out });
const hud = await page.evaluate(() =>
  [...document.querySelectorAll('div')].map((d) => d.textContent).find((t) => t?.startsWith('Prism Desk')),
);
await browser.close();
console.log('HUD:', hud);
if (!hud || errors.length) {
  console.error('SMOKE FAIL', errors);
  process.exit(1);
}
console.log('SMOKE OK');
