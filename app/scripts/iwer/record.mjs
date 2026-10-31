// Record the managed IWER browser via CDP screencast for RECORD_SECONDS, saving
// timestamped JPEG frames to RECORD_DIR (used to build the trailer).
import fs from 'node:fs';
import path from 'node:path';
export default async function run({ cdp, page }) {
  const dir = process.env.RECORD_DIR ?? '/tmp/prism-frames';
  const secs = Math.min(100, Number(process.env.RECORD_SECONDS ?? 10)); // managed-browser lease cap is 110 s
  fs.mkdirSync(dir, { recursive: true });
  const session = cdp ?? (await page.context().newCDPSession(page));
  let n = 0;
  const index = [];
  session.on('Page.screencastFrame', async (f) => {
    n++;
    const file = path.join(dir, `t${f.metadata.timestamp.toFixed(4)}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    index.push([f.metadata.timestamp, path.basename(file)]);
    try {
      await session.send('Page.screencastFrameAck', { sessionId: f.sessionId });
    } catch {}
  });
  await session.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  await new Promise((r) => setTimeout(r, secs * 1000));
  await session.send('Page.stopScreencast');
  fs.writeFileSync(path.join(dir, `index-${Date.now()}.json`), JSON.stringify(index));
  console.log(`frames=${n}`);
  return { frames: n };
}
