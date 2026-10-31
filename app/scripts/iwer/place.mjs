// Re-run table placement (same path as a Quest recenter) and print the result.
export default async function run({ frame, page }) {
  const t = frame ?? page;
  await t.evaluate(() => globalThis.__prism.place());
  await t.waitForTimeout(500);
  const s = await t.evaluate(() => globalThis.__prism.state());
  console.log(JSON.stringify({ pose: s.pose, roomCells: s.roomCells, level: s.level }));
  return { pose: s.pose, roomCells: s.roomCells };
}
