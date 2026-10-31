// Evaluate a JS expression (PRISM_EXPR env) in the app frame and print JSON.
export default async function run({ frame, page }) {
  const t = frame ?? page;
  const r = await t.evaluate((src) => (0, eval)(src), process.env.PRISM_EXPR ?? '__prism.state()');
  console.log('RESULT ' + JSON.stringify(r));
  return r;
}
