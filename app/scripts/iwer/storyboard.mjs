// Trailer storyboard: drives the IWER emulator in-page (fast) while recording a CDP screencast.
// SEGMENT=main|return, RECORD_DIR=<frames dir>, MARKS=<marks file>. Each run fits the 110 s browser lease.
import fs from 'node:fs';
import path from 'node:path';

export default async function run({ cdp, page, frame }) {
  const t = frame ?? page;
  const dir = process.env.RECORD_DIR ?? '/tmp/prism-frames';
  const marks = process.env.MARKS ?? '/tmp/marks.txt';
  const seg = process.env.SEGMENT ?? 'main';
  fs.mkdirSync(dir, { recursive: true });
  const session = cdp ?? (await page.context().newCDPSession(page));
  let n = 0;
  session.on('Page.screencastFrame', async (f) => {
    n++;
    fs.writeFileSync(path.join(dir, `t${f.metadata.timestamp.toFixed(4)}.jpg`), Buffer.from(f.data, 'base64'));
    try {
      await session.send('Page.screencastFrameAck', { sessionId: f.sessionId });
    } catch {}
  });
  const mark = (name) => fs.appendFileSync(marks, `${(Date.now() / 1000).toFixed(4)} ${name}\n`);
  const wait = (s) => page.waitForTimeout(s * 1000);
  const E = (fn, arg) => t.evaluate(fn, arg);

  // in-page helpers
  await E(() => {
    const D = (m, p) => globalThis.IWER_MCP.dispatch(m, p);
    const P = globalThis.__prism;
    const pokeAt = (p) =>
      D('run_sequence', {
        device: 'hand-right',
        steps: [
          { label: 'poke', position: { x: p[0], y: p[1], z: p[2], normal: 'up' }, press: { depth: 0.012, hold: 0.2, retract: 0.06 } },
          { label: 'rest', position: { relativeTo: 'body', x: 0.25, y: 0.85, z: -0.05 }, anchor: 'wrist', duration: 0.5 },
        ],
      });
    const head = (x, y, z, pitch, yaw, duration = 2) =>
      D('animate_to', { device: 'headset', position: { x, y, z }, orientation: { pitch, yaw, roll: 0 }, duration, easing: 'minimum-jerk' });
    const SEAT = [-0.15, 1.15, 1.35];
    const lookFrom = (pos, tgt, duration) => {
      const dx = tgt[0] - pos[0], dy = tgt[1] - pos[1], dz = tgt[2] - pos[2];
      const yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;
      const pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
      return head(pos[0], pos[1], pos[2], pitch, yaw, duration);
    };
    const frameBoard = (dist = 0.33, up = 0.34, duration = 2, side = 0) => {
      const c = P.state().pose;
      let ux = SEAT[0] - c.x, uz = SEAT[2] - c.z;
      const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
      // side offset is perpendicular to the view direction
      const pos = [c.x + ux * dist - uz * side, c.y + up, c.z + uz * dist + ux * side];
      return lookFrom(pos, [c.x, c.y, c.z], duration);
    };
    globalThis.__sb = {
      D,
      head,
      lookFrom,
      frameBoard,
      pokeHint: async () => {
        const h = P.state().hint;
        if (h !== null) await pokeAt(P.cellWorld(h));
        return h;
      },
      pokeButton: (a) => pokeAt(P.buttonWorld(a)),
      aimHint: async () => {
        await D('set_transform', { device: 'hand-right', position: { x: -0.4, y: 0.98, z: 1.18 }, orientation: 'auto' });
        const p = P.cellWorld(P.state().hint);
        await D('look_at', { device: 'hand-right', target: { x: p[0], y: p[1], z: p[2] } });
      },
      handAway: () => D('set_transform', { device: 'hand-right', position: { x: 0.1, y: 0.9, z: 1.6 } }),
      select: () => D('select', { device: 'hand-right', duration: 0.25 }),
      state: () => P.state(),
    };
  });
  const sb = (code) => E(`(async()=>{ const sb=globalThis.__sb; return (${code}); })()`);
  const solveLevel = async () => {
    for (let i = 0; i < 8; i++) {
      const s = await sb('sb.state()');
      if (s.solved || s.hint === null) break;
      await sb('sb.pokeHint()');
      await wait(0.2);
    }
  };

  await session.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 720 });
  try {
    if (seg === 'A') {
      mark('placement');
      await wait(0.8);
      await sb('sb.head(-0.15, 1.15, 1.35, -38, 90, 2.5)');
      await wait(0.5);
      await E(() => globalThis.__prism.place());
      await wait(2.5);
      await sb('sb.frameBoard(0.33, 0.34, 2.5)');
      await wait(1);
      mark('tutorial1');
      await sb('sb.pokeHint()');
      await wait(2.5);
      mark('tutorial2');
      for (let k = 0; k < 2; k++) {
        await sb('sb.aimHint()');
        await wait(0.6);
        await sb('sb.select()');
        await wait(0.9);
      }
      await sb('sb.handAway()');
      await wait(2.5);
    } else if (seg === 'B') {
      mark('daily');
      await sb('sb.frameBoard(0.36, 0.36, 0.1)');
      await wait(2.5);
      mark('spill');
      const sp = (await sb('sb.state()')).spillPoint;
      if (sp) {
        const c = (await sb('sb.state()')).pose;
        await sb(`sb.lookFrom([${c.x + (-0.15 - c.x) * 0.9}, 1.3, ${c.z + (1.35 - c.z) * 0.9}], [${sp[0]}, ${sp[1]}, ${sp[2]}], 2.5)`);
        await wait(3);
        await sb('sb.frameBoard(0.36, 0.36, 2)');
        await wait(1);
      }
      mark('dwell');
      await sb("sb.pokeButton('dwell')");
      await wait(0.4);
      await sb('sb.aimHint()');
      await wait(2.6);
      await sb('sb.handAway()');
      await sb("sb.pokeButton('dwell')");
      mark('contrast');
      await sb("sb.pokeButton('contrast')");
      await wait(2.5);
      await sb("sb.pokeButton('contrast')");
      await wait(1);
    } else if (seg === 'C') {
      mark('finish');
      await sb('sb.frameBoard(0.36, 0.36, 0.1)');
      await solveLevel();
      await wait(2);
      await solveLevel();
      await wait(2);
      await solveLevel();
      await wait(1.5);
      mark('daycomplete');
      await sb('sb.frameBoard(0.5, 0.4, 3)');
      await wait(3);
    } else {
      mark('garden_view');
      await sb('sb.frameBoard(0.45, 0.38, 0.1)');
      await wait(2.5);
      await sb('sb.frameBoard(0.38, 0.3, 3, 0.15)');
      await wait(2.5);
      mark('anchor_exit');
      await sb("sb.D('end_session', {})");
      await wait(1.2);
      await sb("sb.D('accept_session', {})");
      await wait(1);
      await sb("sb.D('set_input_mode', {mode:'hand'})");
      await sb("sb.D('set_transform', {device:'headset', position:{x:0.6,y:1.6,z:0.2}, orientation:{pitch:-15,yaw:0,roll:0}})");
      mark('anchor');
      await wait(1.5);
      await sb('sb.frameBoard(0.6, 0.5, 3)');
      await wait(3);
    }
  } finally {
    mark(`end_${seg}`);
    await session.send('Page.stopScreencast');
  }
  const s = await sb('sb.state()');
  console.log(JSON.stringify({ frames: n, level: s.level, dayComplete: s.dayComplete, anchor: s.anchor, spill: s.spill }));
  return { frames: n };
}
