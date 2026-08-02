// VG — THE VISUAL REGRESSION GATE (arc step 2, I-57/GBC-63): rendered geometry
// measured against the layout contracts IN REAL CHROMIUM. "Does it look right"
// RETURNs like everything else.
//   node utilization/bench/visual-gate.mjs               → compare against pins
//   node utilization/bench/visual-gate.mjs --discharge   → (re)compute the pins
// Pins are COMPUTED, never hand-written (I-57b); a re-pin happens only in a commit
// naming the cause. Pixel-hashes rejected on the record (I-57c) — screenshots are
// saved to /tmp as human artifacts, never compared.
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN_FILE = join(HERE, 'visual-pins.json');
const DISCHARGE = process.argv.includes('--discharge');
const sha = (s) => createHash('sha256').update(s).digest('hex');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = join(HERE, req.url === '/' ? 'game.html' : req.url.split('?')[0]);
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'text/plain' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(4174, r));

const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

/** VG1/VG3 — DOM-vs-LAW (I-57a): every [data-region] rect ≡ its LayoutDef; every def region PRESENT. */
const domVsLaw = (scope) => page.evaluate((sel) => {
  const bad = [];
  for (const g of document.querySelectorAll(`${sel} [data-layout]`)) {
    const id = g.getAttribute('data-layout');
    const def = window.__GAME__.layoutById(id);
    if (!def) { bad.push(`${id}: NO DEF on the law surface`); continue; }
    const rendered = g.querySelectorAll(':scope > g[data-region]');
    if (rendered.length !== def.regions.length) bad.push(`${id}: ${rendered.length} regions rendered, law says ${def.regions.length}`);
    for (const rg of rendered) {
      const rid = rg.getAttribute('data-region');
      const law = def.regions.find((r) => r.id === rid);
      const rect = rg.querySelector('rect');
      if (!law) { bad.push(`${id}/${rid}: rendered but NOT IN LAW`); continue; }
      if (!rect) { bad.push(`${id}/${rid}: no rect`); continue; }
      const got = ['x', 'y', 'width', 'height'].map((a) => Number(rect.getAttribute(a)));
      const want = [law.x, law.y, law.w, law.h];
      if (got.some((v, i) => v !== want[i])) bad.push(`${id}/${rid}: rect ${got.join(',')} ≠ law ${want.join(',')}`);
    }
  }
  return bad;
}, scope);

// ── the canonical deterministic state: fresh seeded game · popups dismissed · overview ──
await page.goto('http://localhost:4174/game.html');
await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
await page.evaluate(() => { localStorage.clear(); });
await page.reload();
await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
await page.evaluate(() => window.__GAME__.dismiss());
await page.evaluate(() => window.__GAME__.setCamera('overview'));

// VG1 — the live table scene against the law
const vg1 = await domVsLaw('#stage');
check('VG1/scene-dom-vs-law', vg1.length === 0, vg1.slice(0, 4).join(' | ') || 'all regions ≡ law');
await page.screenshot({ path: '/tmp/vg-scene.png' });

// VG2 — computed scene pins (I-57b)
const pins = existsSync(PIN_FILE) ? JSON.parse(readFileSync(PIN_FILE, 'utf8')) : {};
const derived = {};
derived['scene:fresh-overview'] = sha(await page.evaluate(() => document.getElementById('stage').innerHTML));
// the books modal at the fresh state (deterministic zero balance)
await page.evaluate(() => window.__GAME__.openBooks());
derived['modal:books-fresh'] = sha(await page.evaluate(() => document.getElementById('popped').innerHTML));
// VG3 — the popped panel against the law
const vg3 = await domVsLaw('#popped');
check('VG3/modal-dom-vs-law', vg3.length === 0, vg3.slice(0, 4).join(' | ') || 'popped ≡ law');
await page.screenshot({ path: '/tmp/vg-books.png' });
await page.evaluate(() => window.__GAME__.dismiss());
// the static showcase
await page.goto('http://localhost:4174/showcase.html');
await page.waitForFunction(() => document.getElementById('stage')?.innerHTML.length > 0);
derived['scene:showcase'] = sha(await page.evaluate(() => document.getElementById('stage').innerHTML));
await page.screenshot({ path: '/tmp/vg-showcase.png' });

if (DISCHARGE) {
  writeFileSync(PIN_FILE, JSON.stringify(derived, null, 2) + '\n');
  check('VG2/pins', true, `DISCHARGE: ${Object.keys(derived).length} pins computed and written`);
} else {
  const bad = Object.entries(derived).filter(([k, v]) => pins[k] !== v);
  const missing = Object.keys(derived).filter((k) => !(k in pins));
  check('VG2/pins-rederive', bad.length === 0 && missing.length === 0,
    bad.length || missing.length ? `MISMATCH: ${bad.map(([k]) => k).join(',')} missing: ${missing.join(',')}` : `${Object.keys(derived).length}/3 pins re-derived byte-equal`);
}

// VG4 — camera purity in-DOM: same camera → byte-equal viewBox (GX-39 family)
await page.goto('http://localhost:4174/game.html');
await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
await page.evaluate(() => window.__GAME__.dismiss());
await page.evaluate(() => window.__GAME__.setCamera('table'));
const vb1 = await page.evaluate(() => window.__GAME__.viewBox());
await page.evaluate(() => window.__GAME__.setCamera('overview'));
await page.evaluate(() => window.__GAME__.setCamera('table'));
const vb2 = await page.evaluate(() => window.__GAME__.viewBox());
check('VG4/camera-purity', vb1 !== null && vb1 === vb2, `${vb1} ≡ ${vb2}`);

// VG5 — a11y floor in-DOM: every rendered region carries its <title>
const vg5 = await page.evaluate(() => {
  const bad = [];
  for (const rg of document.querySelectorAll('#stage [data-layout] > g[data-region]')) {
    if (!rg.querySelector('title')) bad.push(`${rg.closest('[data-layout]').getAttribute('data-layout')}/${rg.getAttribute('data-region')}`);
  }
  return bad;
});
check('VG5/a11y-floor-in-dom', vg5.length === 0, vg5.slice(0, 4).join(' | ') || 'every region titled');

await browser.close();
server.close();

const fails = results.filter((r) => !r.pass).length;
console.log(JSON.stringify(results, null, 2));
console.log(`\nVISUAL GATE ${results.length - fails}/${results.length}${DISCHARGE ? ' · PINS DISCHARGED' : ''}`);
process.exit(fails === 0 ? 0 : 1);
