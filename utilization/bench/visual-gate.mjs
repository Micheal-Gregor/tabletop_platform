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
// graceful VG7 waits (K7-3d-R D4): a hung verdict FAILS the named check, never crashes the gate
const waitVerdict = async (name) => {
  try { await page.waitForFunction(() => window.__SPIKE__.verdict() !== null, null, { timeout: 60000 }); return true; }
  catch { check(name, false, 'verdict never arrived (timeout) — the HK-11 completion path is dead'); return false; }
};
// VG7b: the honest flip — displayed READ from the RENDERED title label (M-MIRROR killed:
// a reverted fill renders '[title]', which cannot equal the seed)
await page.evaluate(() => window.__SPIKE__.flip());
if (await waitVerdict('VG7b/3d-flip-hk11-in-sync')) {
  const v1 = await page.evaluate(() => window.__SPIKE__.verdict());
  check('VG7b/3d-flip-hk11-in-sync', v1.ok === true && v1.displayed === v1.result, `displayed "${v1.displayed}" · result "${v1.result}"`);
}
// VG7c: the COMMITTED forced mismatch — truth must win (displayed lies, result = seed)
await page.evaluate(() => { window.__SPIKE__.resetFlip(); window.__SPIKE__.forceMismatch(); });
if (await waitVerdict('VG7c/3d-theater-truth-wins')) {
  const v2 = await page.evaluate(() => window.__SPIKE__.verdict());
  check('VG7c/3d-theater-truth-wins', v2.ok === false && v2.displayed === 'wrong-card' && v2.result !== 'wrong-card', `displayed "${v2.displayed}" → truth "${v2.result}"`);
}
// VG7d — K7-3d-R D1-R2 (the dead-camera class, killed properly this time): assert on
// SEAT-0, whose mapped position differs from the default on EVERY axis (table's cx
// equals the world center, which let a no-op camera pass); re-derive x/y/z from the
// preset DATA via the pinned mapping; and the camera must PROVABLY MOVE between
// presets (the I-57d law carried into 3D). Boundary on the record: a byte-identical
// hardcoded copy of the same mapping is the accepted equivalent-mutant class (I-60g).
const cam = await page.evaluate(() => {
  document.querySelector('[data-cam="seat-0"]').click();
  const p1 = window.__SPIKE__.cameraPos();
  document.querySelector('[data-cam="table"]').click();
  const pt = window.__SPIKE__.cameraPos();
  document.querySelector('[data-cam="seat-0"]').click();
  return { p1, pt, p2: window.__SPIKE__.cameraPos(), d: window.__SPIKE__.presetData('seat-0') };
});
const dist = 1900 / cam.d.zoom;
const want = { x: cam.d.cx - 800, y: dist * 0.72, z: cam.d.cy - 500 + dist * 0.7 };
const close = (a, b) => Math.abs(a - b) < 1e-6;
const moved7 = !(close(cam.p1.x, cam.pt.x) && close(cam.p1.y, cam.pt.y) && close(cam.p1.z, cam.pt.z));
const pure7 = close(cam.p1.x, cam.p2.x) && close(cam.p1.y, cam.p2.y) && close(cam.p1.z, cam.p2.z);
const lawful7 = close(cam.p1.x, want.x) && close(cam.p1.y, want.y) && close(cam.p1.z, want.z);
check('VG7d/3d-camera-consumes-presets', moved7 && pure7 && lawful7,
  moved7 ? `seat-0 (${cam.p1.x.toFixed(1)},${cam.p1.y.toFixed(1)},${cam.p1.z.toFixed(1)}) ≡ law (${want.x.toFixed(1)},${want.y.toFixed(1)},${want.z.toFixed(1)}) · moved vs table · pure` : 'CAMERA NEVER MOVED between presets');
await page.screenshot({ path: '/tmp/vg-3d.png' });

// ── VG8 — GAME3D, THE A1 STAGE (I-62d: coverage lands WITH the increment, kill-first).
await page.goto('http://localhost:4174/game3d.html');
await page.waitForFunction(() => window.__GAME3D__ && window.__GAME3D__.ready(), null, { timeout: 30000 });
// VG8a: mesh regions ≡ the def-derived expectation
const rc8 = await page.evaluate(() => ({ got: window.__GAME3D__.regionCount(), want: window.__GAME3D__.expectedFromDefs() }));
check('VG8a/3d-stage-regions-vs-law', rc8.got === rc8.want && rc8.want > 0, `${rc8.got} quads ≡ ${rc8.want} from defs`);
// VG8b: the standings panel stamp ≡ an expectation the GATE derives from the projection
// surface (a hardcoded or stale panel diverges and fails — the asked-text stamp class, I-62b)
const st8 = await page.evaluate(() => ({ stamp: window.__GAME3D__.stamped('standings'), v: window.__GAME3D__.viewData() }));
const wantLines = ['THE TABLE', ...[...st8.v.seats].sort((a, b) => b.cash - a.cash).map((s) => `${s.id === st8.v.active ? '★ ' : ''}${s.id}  $${s.cash}`)];
check('VG8b/3d-standings-stamp-vs-projection', JSON.stringify(st8.stamp) === JSON.stringify(wantLines), `stamp [${(st8.stamp ?? []).join(' | ')}] vs law [${wantLines.join(' | ')}]`);
// VG8c: the GLIDE obeys the preset law AT REST — seat-0 (every axis differs from default),
// provable-move vs table, purity on re-glide (I-62c; the dead-camera class stays dead)
const glide = async (name) => {
  await page.evaluate((n) => window.__GAME3D__.glideTo(n), name);
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); }
  catch { check('VG8c/3d-stage-glide-law', false, `glide to ${name} never rested (timeout)`); return null; } // named, never a crash (I-60g)
  return page.evaluate(() => window.__GAME3D__.cameraPos());
};
const g1 = await glide('seat-0');
const gt = g1 && await glide('table');
const g2 = gt && await glide('seat-0');
if (g1 && gt && g2) {
const pd8 = await page.evaluate(() => window.__GAME3D__.presetData('seat-0'));
const d8 = 1900 / pd8.zoom;
const want8 = { x: pd8.cx - 800, y: d8 * 0.72, z: pd8.cy - 500 + d8 * 0.7 };
const near = (a, b) => Math.abs(a - b) < 1e-9; // K7-A1 D3: rest is an EXACT copy of the mapped target — identical IEEE expressions, no epsilon to hide in
const moved8 = !(near(g1.x, gt.x) && near(g1.y, gt.y) && near(g1.z, gt.z));
const pure8 = near(g1.x, g2.x) && near(g1.y, g2.y) && near(g1.z, g2.z);
const lawful8 = near(g1.x, want8.x) && near(g1.y, want8.y) && near(g1.z, want8.z);
check('VG8c/3d-stage-glide-law', moved8 && pure8 && lawful8,
  moved8 ? `seat-0 rest (${g1.x.toFixed(1)},${g1.y.toFixed(1)},${g1.z.toFixed(1)}) ≡ law (${want8.x.toFixed(1)},${want8.y.toFixed(1)},${want8.z.toFixed(1)}) · moved · pure` : 'CAMERA NEVER MOVED');
}
// VG8d: the header chrome speaks the projection (round + active seat)
const hdr8 = await page.evaluate(() => ({ txt: document.getElementById('hdr').textContent, v: window.__GAME3D__.viewData() }));
check('VG8d/3d-chrome-vs-projection', hdr8.txt.includes(`round ${hdr8.v.round}`) && hdr8.txt.includes(`${hdr8.v.active}'s turn`), hdr8.txt.slice(0, 90));
// VG8e — REAL INPUT (K7-A1 D1 closure, kill-first): the gate drives the ACTUAL input
// paths — a preset button click, a raycast click on a board, a wheel dolly — and the
// unknown-preset refusal. Dead handlers now fail by name (M5 class killed).
await page.click('[data-cam="overview"]');
try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* named below */ }
const btnName = await page.evaluate(() => window.__GAME3D__.camName());
const bxy = await page.evaluate(() => window.__GAME3D__.boardScreenXY(1));
let clickName = 'NO-BOARD-XY';
if (bxy) {
  await page.mouse.click(bxy.x, bxy.y);
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* fall through */ }
  clickName = await page.evaluate(() => window.__GAME3D__.camName());
}
const stg = await page.locator('#stage canvas').boundingBox();
await page.mouse.move(stg.x + stg.width / 2, stg.y + stg.height / 2);
await page.mouse.wheel(0, -240);
const wheelName = await page.evaluate(() => window.__GAME3D__.camName());
const refused = await page.evaluate(() => { try { window.__GAME3D__.glideTo('nope'); return 'NO-THROW'; } catch (e) { return /unknown preset/.test(String(e)) ? 'refused-named' : 'wrong-error'; } });
check('VG8e/3d-real-input-paths', btnName === 'overview' && clickName === 'seat-1' && wheelName === 'custom' && refused === 'refused-named',
  `button→${btnName} · board-click→${clickName} · wheel→${wheelName} · unknown-preset→${refused}`);
// VG8f — READ VIEW (I-63, the owner's A1 playtest ruling; kill-first): flat overhead
// for the table, face-on for a board, FIT (no bbox corner cropped), pan clamped to the
// object, orientation unchanged while panning, re-toggle purity (pan resets).
const waitRest = async (name) => {
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); return true; }
  catch { check(name, false, 'read glide never rested (timeout)'); return false; }
};
// table read: overhead + fit
await page.evaluate(() => window.__GAME3D__.toggleRead('table'));
if (await waitRest('VG8f/read-view-law')) {
  const t = await page.evaluate(() => ({
    st: window.__GAME3D__.readState(), pos: window.__GAME3D__.cameraPos(),
    look: window.__GAME3D__.lookAtPoint(), corners: window.__GAME3D__.cornersNdc(), cam: window.__GAME3D__.camName(),
    center: window.__GAME3D__.focusBoxCenter(),
  }));
  const overhead = Math.abs(t.pos.x - t.look.x) < 1e-6 && Math.abs(t.pos.z - t.look.z) < 1e-6 && t.pos.y > t.look.y;
  const fit = t.corners && t.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
  const framed = t.corners && Math.max(...t.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
  // K7-A1b D2: CENTERED — the object's bbox center sits on the optical axis (NDC origin)
  const cNdc = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), t.center);
  const centered = Math.abs(cNdc.x) < 1e-6 && Math.abs(cNdc.y) < 1e-6;
  // K7-A1b D2: SCREEN ORIENTATION — overhead read shows layout-up (world −z) as screen-up (I-63g)
  const oNdc = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z - 200), t.center);
  const oriented = oNdc.y - cNdc.y > 0 && Math.abs(oNdc.x - cNdc.x) < 1e-6;
  // pan: orientation must NOT change; the look stays inside the object's bounds even on a huge drag
  const q1 = await page.evaluate(() => window.__GAME3D__.quat());
  await page.evaluate(() => { window.__GAME3D__.panProbe(4000, 2500); });
  const afterPan = await page.evaluate(() => ({ q: window.__GAME3D__.quat(), inside: window.__GAME3D__.lookInsideFocusBox(), st: window.__GAME3D__.readState() }));
  const qSame = ['x', 'y', 'z', 'w'].every((k) => Math.abs(q1[k] - afterPan.q[k]) < 1e-9);
  const clamped = afterPan.inside === true && afterPan.st.panned === true;
  // re-toggle purity: scene → read again = fit pose restored, pan reset
  await page.evaluate(() => { window.__GAME3D__.toggleRead(); window.__GAME3D__.toggleRead('table'); });
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const t2 = await page.evaluate(() => ({ pos: window.__GAME3D__.cameraPos(), st: window.__GAME3D__.readState() }));
  const pure = Math.abs(t2.pos.x - t.pos.x) < 1e-6 && Math.abs(t2.pos.y - t.pos.y) < 1e-6 && Math.abs(t2.pos.z - t.pos.z) < 1e-6 && t2.st.panned === false;
  check('VG8f/read-view-law', t.st.mode === 'read' && t.cam === 'table:read' && overhead && centered && oriented && fit && framed && qSame && clamped && pure,
    `overhead:${overhead} centered:${centered} oriented:${oriented} fit:${fit} framed:${framed} pan-orient-stable:${qSame} pan-clamped:${clamped} retoggle-pure:${pure}`);
}
// board read: face-on to seat-1 (camera direction ∥ the board normal)
await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
await page.evaluate(() => window.__GAME3D__.toggleRead('seat-1'));
if (await waitRest('VG8f/read-board-face-on')) {
  const b = await page.evaluate(() => ({
    pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint(),
    corners: window.__GAME3D__.cornersNdc(), cam: window.__GAME3D__.camName(),
    center: window.__GAME3D__.focusBoxCenter(),
  }));
  // face-on: the view direction matches the board normal (0, sin .25, cos .25) — dot ≈ −1 toward the board
  const dir = { x: b.look.x - b.pos.x, y: b.look.y - b.pos.y, z: b.look.z - b.pos.z };
  const len = Math.hypot(dir.x, dir.y, dir.z);
  const n = { x: 0, y: Math.sin(0.25), z: Math.cos(0.25) }; // boards rotated x by −0.25
  const dot = (dir.x * n.x + dir.y * n.y + dir.z * n.z) / len;
  const faceOn = Math.abs(dot + 1) < 1e-6;
  const fitB = b.corners && b.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
  // K7-A1b D4: the framed floor the table leg had — an all-zero corner lie dies here too
  const framedB = b.corners && Math.max(...b.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
  // K7-A1b D2 on the board leg: centered + world-up as screen-up (I-63g)
  const cNdcB = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), b.center);
  const centeredB = Math.abs(cNdcB.x) < 1e-6 && Math.abs(cNdcB.y) < 1e-6;
  const oNdcB = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y + 200, c.z), b.center);
  const orientedB = oNdcB.y - cNdcB.y > 0 && Math.abs(oNdcB.x - cNdcB.x) < 1e-6;
  check('VG8f/read-board-face-on', b.cam === 'seat-1:read' && faceOn && centeredB && orientedB && fitB && framedB,
    `dot ${dot.toFixed(6)} (want −1) · centered:${centeredB} oriented:${orientedB} fit:${fitB} framed:${framedB}`);
}
await page.screenshot({ path: '/tmp/vg-3d-read.png' });
await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {}); // K7-A1b D5: screenshot at rest

// VG8g — THE SIX-SEAT STAGE (I-65, owner-ruled 2026-08-02; kill-first): six boards
// two-sided, far seats approached from THEIR side, the glide ORBITS around the table
// (never over/through), backs are shop-graphic only (no data), far boards read face-on.
{
  // six seat groups exist
  const keys = await page.evaluate(() => window.__GAME3D__.seatGroupKeys());
  const six = JSON.stringify(keys) === JSON.stringify(['seat-0', 'seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5']);
  // far-seat approach law (I-65b; the VG8c exactness discipline): seat-4 from the FAR side
  await page.evaluate(() => window.__GAME3D__.glideTo('seat-4'));
  let lawful4 = false, restOk = true;
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { restOk = false; }
  if (restOk) {
    const g4 = await page.evaluate(() => window.__GAME3D__.cameraPos());
    const p4 = await page.evaluate(() => window.__GAME3D__.presetData('seat-4'));
    const d4 = 1900 / p4.zoom;
    const want4 = { x: p4.cx - 800, y: d4 * 0.72, z: p4.cy - 500 - d4 * 0.7 };
    lawful4 = Math.abs(g4.x - want4.x) < 1e-9 && Math.abs(g4.y - want4.y) < 1e-9 && Math.abs(g4.z - want4.z) < 1e-9;
  }
  check('VG8g/six-seats-far-approach', six && restOk && lawful4,
    `six:${six} · far-law:${lawful4}${restOk ? '' : ' · GLIDE TIMEOUT'}`);

  // ORBITAL GLIDE (I-65d): seat-1 → seat-4 crosses sides; the camera's horizontal
  // radius about the table center must NEVER collapse (a straight line cuts across).
  await page.evaluate(() => window.__GAME3D__.glideTo('seat-1'));
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* named below */ }
  const r0 = await page.evaluate(() => { const p = window.__GAME3D__.cameraPos(); return Math.hypot(p.x, p.z); });
  await page.evaluate(() => window.__GAME3D__.glideTo('seat-4'));
  let minR = Infinity, orbitRest = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const s = await page.evaluate(() => ({ p: window.__GAME3D__.cameraPos(), g: window.__GAME3D__.gliding() }));
    minR = Math.min(minR, Math.hypot(s.p.x, s.p.z));
    if (!s.g) { orbitRest = true; break; }
    await new Promise((r) => setTimeout(r, 25));
  }
  const r1 = await page.evaluate(() => { const p = window.__GAME3D__.cameraPos(); return Math.hypot(p.x, p.z); });
  const orbital = orbitRest && minR >= 0.7 * Math.min(r0, r1);
  check('VG8g/orbital-glide-around', orbital,
    orbitRest ? `minR ${minR.toFixed(0)} vs wall ${(0.7 * Math.min(r0, r1)).toFixed(0)} (r0 ${r0.toFixed(0)} r1 ${r1.toFixed(0)})` : 'orbit glide never rested (timeout)');

  // BACKS ARE SHOP-GRAPHIC ONLY (I-65c): every seat board — front carries the data
  // ($), the back carries the shop identity and NO data. Contrast pair per board.
  const stamps = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.boardStamps(i)));
  const backsOk = stamps.every((st, i) =>
    st && st.front && st.back
    && st.front.some((l) => l.includes('$'))
    && !st.back.some((l) => l.includes('$'))
    && st.back.length === 2 && st.back[1] === '[shop art]');
  check('VG8g/backs-shop-graphic-only', backsOk,
    stamps.map((st, i) => `${i}:${st && st.back ? (st.back.some((l) => l.includes('$')) ? 'LEAK' : 'ok') : 'MISSING'}`).join(' '));

  // far board read: face-on along the FAR normal (0, sin.25, −cos.25) + full pose law
  await page.evaluate(() => window.__GAME3D__.toggleRead('seat-4'));
  if (await waitRest('VG8g/read-far-board-face-on')) {
    const f = await page.evaluate(() => ({
      pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint(),
      corners: window.__GAME3D__.cornersNdc(), cam: window.__GAME3D__.camName(),
      center: window.__GAME3D__.focusBoxCenter(),
    }));
    const dirF = { x: f.look.x - f.pos.x, y: f.look.y - f.pos.y, z: f.look.z - f.pos.z };
    const lenF = Math.hypot(dirF.x, dirF.y, dirF.z);
    const nF = { x: 0, y: Math.sin(0.25), z: -Math.cos(0.25) }; // the near normal flipped π about Y
    const dotF = (dirF.x * nF.x + dirF.y * nF.y + dirF.z * nF.z) / lenF;
    const faceOnF = Math.abs(dotF + 1) < 1e-6;
    const fitF = f.corners && f.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
    const framedF = f.corners && Math.max(...f.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
    const cNdcF = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), f.center);
    const centeredF = Math.abs(cNdcF.x) < 1e-6 && Math.abs(cNdcF.y) < 1e-6;
    const oNdcF = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y + 200, c.z), f.center);
    const orientedF = oNdcF.y - cNdcF.y > 0 && Math.abs(oNdcF.x - cNdcF.x) < 1e-6;
    check('VG8g/read-far-board-face-on', f.cam === 'seat-4:read' && faceOnF && centeredF && orientedF && fitF && framedF,
      `dot ${dotF.toFixed(6)} (want −1) · centered:${centeredF} oriented:${orientedF} fit:${fitF} framed:${framedF}`);
  }
  await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
}

// VG8h — THE BOUNDED ZOOM CONTINUUM (I-64, the owner's amended ruling; kill-first;
// REAL wheel input per the VG8e discipline): zoom-in past 100% enters the focus's
// read view ORGANICALLY; zoom-out lands at TABLE READ; both walls hold.
{
  const stgBox = await page.locator('#stage canvas').boundingBox();
  await page.mouse.move(stgBox.x + stgBox.width / 2, stgBox.y + stgBox.height / 2);
  await page.evaluate(() => window.__GAME3D__.glideTo('seat-1'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  // wheel IN → organic read entry on the focused seat (no toggle call anywhere here)
  let entered = false;
  for (let i = 0; i < 40 && !entered; i++) {
    await page.mouse.wheel(0, -240);
    entered = await page.evaluate(() => window.__GAME3D__.zoomState().mode === 'read');
  }
  const zIn = await page.evaluate(() => window.__GAME3D__.zoomState());
  const organicIn = entered && zIn.focus === 'seat-1';
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const inName = await page.evaluate(() => window.__GAME3D__.camName());
  // wheel OUT from seat read → TABLE read (the owner's amendment: the out endpoint),
  // DIRECTLY — the mode never drops back to scene on the way ("easily move from seat
  // read view to table read view")
  let atTable = false, everScene = false;
  for (let i = 0; i < 40 && !atTable; i++) {
    await page.mouse.wheel(0, 240);
    const z = await page.evaluate(() => window.__GAME3D__.zoomState());
    if (z.mode === 'scene') everScene = true;
    atTable = z.mode === 'read' && z.focus === 'table';
  }
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const outName = await page.evaluate(() => window.__GAME3D__.camName());
  const ovh = await page.evaluate(() => ({ pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint() }));
  const outOverhead = Math.abs(ovh.pos.x - ovh.look.x) < 1e-6 && Math.abs(ovh.pos.z - ovh.look.z) < 1e-6 && ovh.pos.y > ovh.look.y;
  check('VG8h/wheel-continuum-endpoints', organicIn && inName === 'seat-1:read' && atTable && !everScene && outName === 'table:read' && outOverhead,
    `organic-in:${organicIn} (${inName}) · out-to-table:${atTable} direct:${!everScene} (${outName}) · overhead:${outOverhead}`);
  // the WALLS: table read's far wall (fit) and the resolution floor (IN_FLOOR × fit)
  const fitT = await page.evaluate(() => window.__GAME3D__.readFit('table'));
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 240);
  const distFar = await page.evaluate(() => window.__GAME3D__.zoomState().dist);
  const farWall = distFar <= fitT * 1.001;
  for (let i = 0; i < 60; i++) await page.mouse.wheel(0, -240);
  const zFloor = await page.evaluate(() => window.__GAME3D__.zoomState());
  const floorWall = zFloor.mode === 'read' && zFloor.focus === 'table' && zFloor.dist >= zFloor.inFloor * fitT * 0.999;
  check('VG8h/wheel-continuum-walls', farWall && floorWall,
    `far-wall:${farWall} (${distFar.toFixed(0)} vs fit ${fitT.toFixed(0)}) · floor:${floorWall} (${zFloor.dist.toFixed(0)} vs ${(zFloor.inFloor * fitT).toFixed(0)})`);
  await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
}
await page.screenshot({ path: '/tmp/vg-3d-stage.png' });

await browser.close();
server.close();

const fails = results.filter((r) => !r.pass).length;
console.log(JSON.stringify(results, null, 2));
console.log(`\nVISUAL GATE ${results.length - fails}/${results.length}${DISCHARGE ? ' · PINS DISCHARGED' : ''}`);
process.exit(fails === 0 ? 0 : 1);
