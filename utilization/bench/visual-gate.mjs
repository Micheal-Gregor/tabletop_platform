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

/** VG3 per modal (I-59g/GBC-64): pin + DOM-vs-law + in-modal titles, all five popped children. */
const modalCheck = async (key) => {
  derived[key] = sha(await page.evaluate(() => document.getElementById('popped').innerHTML));
  const bad = await domVsLaw('#popped');
  const untitled = await page.evaluate(() =>
    [...document.querySelectorAll('#popped [data-layout] > g[data-region]')].filter((g) => !g.querySelector('title')).map((g) => g.getAttribute('data-region')));
  check(`VG3/${key}`, bad.length === 0 && untitled.length === 0,
    [...bad, ...untitled.map((u) => `untitled:${u}`)].slice(0, 4).join(' | ') || 'dom ≡ law · titled');
};
// books at the fresh state (deterministic zero balance)
await page.evaluate(() => window.__GAME__.openBooks());
await modalCheck('modal:books-fresh');
await page.screenshot({ path: '/tmp/vg-books.png' });
await page.evaluate(() => window.__GAME__.dismiss());
// the preamble → round-card sequence (no state change)
await page.evaluate(() => window.__GAME__.openPreamble());
await modalCheck('modal:preamble-fresh');
await page.evaluate(() => window.__GAME__.advance());
await modalCheck('modal:round-card-fresh');
await page.evaluate(() => window.__GAME__.dismiss());
// the rivals carousel at page 1 (no state change)
await page.evaluate(() => window.__GAME__.openRivals());
await modalCheck('modal:rivals-fresh');
await page.evaluate(() => window.__GAME__.dismiss());
// the drawn fortune card — the ONE state-moving canonical step (seeded → deterministic
// first card); runs AFTER the scene pin so scene:fresh-overview stays pre-draw
await page.evaluate(() => { document.querySelector('[data-act="draw"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await modalCheck('modal:fortune-first-draw');
await page.screenshot({ path: '/tmp/vg-fortune.png' });
await page.evaluate(() => window.__GAME__.dismiss());
// VG6 — THE REDACTION LAW, DATA-TRUE (K7-v7 D1-R closure: the first form was
// label-deep — it tested the renderer's ternary against itself and M-A survived).
// Now: the ids EXTRACTED FROM THE RENDERED CARDS must equal the PROJECTION's truth —
// own board ≡ newest-three ownDiscard; every rival ≡ [public top] or [] (zero cards
// when a rival has no discard). A leaked ownDiscard fails by value, whatever its label.
const vg6 = await page.evaluate(() => {
  const bad = [];
  const truth = window.__GAME__.handTruth();
  if (!truth) return ['no truth surface'];
  const seatOrder = Object.keys(truth.tops); // SEATS order = board data-focus index order
  const boards = [...document.querySelectorAll('#stage [data-focus^="seat-"]')].filter((b) => b.querySelector('[data-layout="boty:shop-board"]'));
  if (boards.length !== seatOrder.length) bad.push(`expected ${seatOrder.length} boards, found ${boards.length}`);
  let ownChecked = false;
  for (const b of boards) {
    const seat = seatOrder[Number(b.getAttribute('data-focus').slice(5))];
    const ids = [...b.querySelectorAll('[data-layout="template:card"]')].map((f) => f.querySelector('[data-region="title"] text')?.textContent ?? '?');
    const want = seat === truth.viewSeat ? truth.own : truth.tops[seat] ? [truth.tops[seat]] : [];
    if (seat === truth.viewSeat) ownChecked = true;
    if (JSON.stringify(ids) !== JSON.stringify(want)) bad.push(`board ${seat}: fan [${ids.join(',')}] ≠ projection truth [${want.join(',')}]`);
  }
  if (!ownChecked) bad.push('viewing board never checked');
  if (truth.own.length < 1) bad.push('canonical state should be post-draw (own hand empty)');
  return bad;
});
check('VG6/redaction-data-true', vg6.length === 0, vg6.slice(0, 3).join(' | ') || 'every fan ≡ projection truth (own: newest-3 · rivals: public top or none)');
// the cards gallery joins the gate (K7-v7 D3 closure: EVERYTHING popped is now covered)
await page.click('#gallery');
await modalCheck('modal:gallery-first-draw');
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
  const orphaned = Object.keys(pins).filter((k) => !(k in derived)); // K7-vg D4: a stale pin rides no more
  check('VG2/pins-rederive', bad.length === 0 && missing.length === 0 && orphaned.length === 0,
    bad.length || missing.length || orphaned.length
      ? `MISMATCH: ${bad.map(([k]) => k).join(',')} missing: ${missing.join(',')} orphaned: ${orphaned.join(',')}`
      : `${Object.keys(derived).length}/${Object.keys(pins).length} pins re-derived byte-equal, none orphaned`);
}

// VG4 — camera purity in-DOM (GX-39 family), K7-vg D1 closure: the camera must
// PROVABLY MOVE (table ≠ overview — a dead setCamera can no longer compare a viewBox
// to itself) and then re-derive byte-equal on the same preset.
await page.goto('http://localhost:4174/game.html');
await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
await page.evaluate(() => window.__GAME__.dismiss());
const vbOverview = await page.evaluate(() => { window.__GAME__.setCamera('overview'); return window.__GAME__.viewBox(); });
await page.evaluate(() => window.__GAME__.setCamera('table'));
const vb1 = await page.evaluate(() => window.__GAME__.viewBox());
await page.evaluate(() => window.__GAME__.setCamera('overview'));
await page.evaluate(() => window.__GAME__.setCamera('table'));
const vb2 = await page.evaluate(() => window.__GAME__.viewBox());
const moved = vb1 !== null && vbOverview !== null && vb1 !== vbOverview;
check('VG4/camera-purity', moved && vb1 === vb2, moved ? `moved ${vbOverview} → ${vb1}; re-derived ≡` : `CAMERA NEVER MOVED (${vbOverview} = ${vb1})`);

// VG5 — a11y floor in-DOM: every rendered region carries its <title>
const vg5 = await page.evaluate(() => {
  const bad = [];
  for (const rg of document.querySelectorAll('#stage [data-layout] > g[data-region]')) {
    if (!rg.querySelector('title')) bad.push(`${rg.closest('[data-layout]').getAttribute('data-layout')}/${rg.getAttribute('data-region')}`);
  }
  return bad;
});
check('VG5/a11y-floor-in-dom', vg5.length === 0, vg5.slice(0, 4).join(' | ') || 'every region titled');

// ── VG7 — THE 3D SPIKE JOINS THE GATE (K7-3d D1 closure; the showcase precedent:
// exhibit status does NOT exempt from coverage). Geometry vs LAW (defs-side count),
// the HK-11 flip with a COMMITTED forced-mismatch drill (kill-first law), and the
// preset-consuming camera. All waits are on STATE (I-60f). No pixel hashes (I-57c).
await page.goto('http://localhost:4174/spike3d.html');
await page.waitForFunction(() => window.__SPIKE__ && window.__SPIKE__.ready(), null, { timeout: 30000 });
// VG7a: mesh quads ≡ the def-derived expectation (M-A class: a dropped region fails)
const rc = await page.evaluate(() => ({ got: window.__SPIKE__.regionCount(), want: window.__SPIKE__.expectedFromDefs() }));
check('VG7a/3d-regions-vs-law', rc.got === rc.want && rc.want > 0, `${rc.got} quads ≡ ${rc.want} from defs`);
// VG7b: the honest flip — displayed READ from the object, verdict in sync
await page.evaluate(() => window.__SPIKE__.flip());
await page.waitForFunction(() => window.__SPIKE__.verdict() !== null, null, { timeout: 60000 });
const v1 = await page.evaluate(() => window.__SPIKE__.verdict());
check('VG7b/3d-flip-hk11-in-sync', v1.ok === true && v1.displayed === v1.result, `displayed "${v1.displayed}" · result "${v1.result}"`);
// VG7c: the COMMITTED forced mismatch — truth must win (displayed lies, result = seed)
await page.evaluate(() => { window.__SPIKE__.resetFlip(); window.__SPIKE__.forceMismatch(); });
await page.waitForFunction(() => window.__SPIKE__.verdict() !== null, null, { timeout: 60000 });
const v2 = await page.evaluate(() => window.__SPIKE__.verdict());
check('VG7c/3d-theater-truth-wins', v2.ok === false && v2.displayed === 'wrong-card' && v2.result !== 'wrong-card', `displayed "${v2.displayed}" → truth "${v2.result}"`);
// VG7d: the camera consumes the preset DATA (x maps directly: cameraX = cx − world.w/2) and is pure
const cam = await page.evaluate(() => {
  window.__SPIKE__ && document.querySelector('[data-cam="table"]').click();
  const x1 = window.__SPIKE__.cameraX();
  document.querySelector('[data-cam="overview"]').click();
  document.querySelector('[data-cam="table"]').click();
  return { x1, x2: window.__SPIKE__.cameraX(), cx: window.__SPIKE__.presetCx('table') };
});
check('VG7d/3d-camera-consumes-presets', cam.x1 === cam.x2 && cam.x1 === cam.cx - 800, `x ${cam.x1} ≡ re-derived ≡ cx−800 (${cam.cx}−800)`);
await page.screenshot({ path: '/tmp/vg-3d.png' });

await browser.close();
server.close();

const fails = results.filter((r) => !r.pass).length;
console.log(JSON.stringify(results, null, 2));
console.log(`\nVISUAL GATE ${results.length - fails}/${results.length}${DISCHARGE ? ' · PINS DISCHARGED' : ''}`);
process.exit(fails === 0 ? 0 : 1);
