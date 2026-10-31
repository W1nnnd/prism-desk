// Print the game's debug snapshot from inside the managed IWER browser.
export default async function run({ frame, page }) {
  const target = frame ?? page;
  const s = await target.evaluate(() => globalThis.__prism?.state());
  console.log(JSON.stringify(s, null, 2));
  return s;
}
