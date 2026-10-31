// Live check: load the deployed page, click the glowing tutorial mirror with the mouse,
// and confirm the board advances (desktop input path) with no console/page errors.
import { chromium } from 'playwright-core';
const url = process.env.SMOKE_URL ?? 'https://w1nnnd.github.io/prism-desk/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(12000);
const before = await p.evaluate(() => globalThis.__prism.state().level);
// Project the hinted mirror to screen space and click it.
const pt = await p.evaluate(() => {
  const s = globalThis.__prism.state();
  return globalThis.__prism.screen?.(s.hint) ?? null;
});
if (pt) await p.mouse.click(pt[0], pt[1]);
await p.waitForTimeout(2500);
const after = await p.evaluate(() => globalThis.__prism.state().level);
await b.close();
console.log(JSON.stringify({ before, clickedAt: pt, after, errors }));
process.exit(before !== after && !errors.length ? 0 : 1);
