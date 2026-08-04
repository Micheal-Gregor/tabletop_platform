// VG — THE VISUAL REGRESSION GATE, THIN RUNNER (K-B, I-78; arc step 2, I-57/GBC-63):
// rendered geometry measured against the layout contracts IN REAL CHROMIUM. "Does it look
// right" RETURNs like everything else. The monolithic visual-gate.mjs (945 ln) split into
// this runner + per-object gate modules under gate/ (each self-seeding, so it passes in
// isolation). This file owns: the http server on GATE_PORT, Playwright chromium, the
// check()/results[] machinery, the pins compare/--discharge for the SVG suite, arg parsing
// (--suite=svg|3d, --check=<VGid>, --discharge), and the final JSON print / VISUAL GATE
// n/total / exit-nonzero-on-fail tail. It passes a shared helper bag to each block.
//   node utilization/bench/gate/run.mjs                  → full battery (all suites)
//   node utilization/bench/gate/run.mjs --suite=3d       → only the 3D groups
//   node utilization/bench/gate/run.mjs --suite=svg      → only the SVG suite + pins
//   node utilization/bench/gate/run.mjs --check=VG8n     → only that group (proves self-seeding)
//   node utilization/bench/gate/run.mjs --discharge      → (re)compute the SVG pins
// Pins are COMPUTED, never hand-written (I-57b); a re-pin happens only in a commit naming
// the cause. Pixel-hashes rejected on the record (I-57c) — screenshots are saved to /tmp
// as human artifacts, never compared.
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import registry from './registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)); // …/utilization/bench/gate
const BENCH = dirname(HERE); // …/utilization/bench — the html/dist/pins root
const PIN_FILE = join(BENCH, 'visual-pins.json');
const GATE_PORT = Number(process.env.GATE_PORT) || 4174;
const sha = (s) => createHash('sha256').update(s).digest('hex');

// ── arg parsing ──
const argv = process.argv.slice(2);
const DISCHARGE = argv.includes('--discharge');
const suiteArg = (argv.find((a) => a.startsWith('--suite=')) ?? '').split('=')[1] || null;
const checkArg = (argv.find((a) => a.startsWith('--check=')) ?? '').split('=')[1] || null;

let selected = registry;
if (checkArg) selected = registry.filter((g) => g.id === checkArg);
else if (suiteArg) selected = registry.filter((g) => g.suite === suiteArg);
if (selected.length === 0) {
  console.error(`no gate groups matched ${checkArg ? `--check=${checkArg}` : `--suite=${suiteArg}`}. known ids: ${registry.map((g) => g.id).join(', ')}`);
  process.exit(2);
}

// ── the static server (serves game.html / game3d.html / showcase.html / spike3d.html + dist) ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = join(BENCH, req.url === '/' ? 'game.html' : req.url.split('?')[0]);
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'text/plain' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(GATE_PORT, r));

const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
// G-1 (I-101): the NAMED FRIENDLY FAILURE — the carried run.mjs next-touch, reproduced
// in the wild at I-100 (the owner hit the raw Playwright throw from a shell without the
// env var). A missing browser now names the fix in both shells and exits 2.
if (!existsSync(exe)) {
  console.error(
    `VISUAL GATE: no Chromium executable at "${exe}".\n` +
    (process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? 'PLAYWRIGHT_CHROMIUM_PATH is set but points at nothing — check the path.'
      : 'Set PLAYWRIGHT_CHROMIUM_PATH to your browser first:\n' +
        '  PowerShell:  $env:PLAYWRIGHT_CHROMIUM_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\n' +
        '  cmd.exe:     set PLAYWRIGHT_CHROMIUM_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  server.close();
  process.exit(2);
}
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

// ── the shared helper bag ── passed to every block's run(h).
/** VG1/VG3/VG5 — DOM-vs-LAW (I-57a): every [data-region] rect ≡ its LayoutDef; every def
 *  region PRESENT. */
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

/** gotoStage — navigate a stage html + wait on its OWN ready signal (I-60f: state, not
 *  clocks). The self-seed primitive: a block that needs game3d/spike3d/game/showcase calls
 *  this at its top and then resets/glides to the pose it asserts. */
async function gotoStage(file) {
  await page.goto(`http://localhost:${GATE_PORT}/${file}`);
  if (file.startsWith('game3d')) await page.waitForFunction(() => window.__GAME3D__ && window.__GAME3D__.ready(), null, { timeout: 30000 });
  else if (file.startsWith('spike3d')) await page.waitForFunction(() => window.__SPIKE__ && window.__SPIKE__.ready(), null, { timeout: 30000 });
  else if (file.startsWith('showcase')) await page.waitForFunction(() => document.getElementById('stage')?.innerHTML.length > 0);
  else await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
}

/** waitRest(name) — wait for the 3D glide to settle; on timeout FAIL the named check (never
 *  crash the gate, I-60g). Verbatim the monolith's shared waitRest. */
async function waitRest(name) {
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); return true; }
  catch { check(name, false, 'read glide never rested (timeout)'); return false; }
}

/** glide(name) — glide to a preset, wait rest, return cameraPos (or null on timeout, no
 *  check). Generic bag helper; VG8a-i keeps a VG8c-named variant locally. */
async function glide(name) {
  await page.evaluate((n) => window.__GAME3D__.glideTo(n), name);
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); }
  catch { return null; }
  return page.evaluate(() => window.__GAME3D__.cameraPos());
}

const hashes = () => page.evaluate(() => ({ h: window.__GAME3D__.rowHash(), m: window.__GAME3D__.moveCount() }));
const info = (rid) => page.evaluate((r) => window.__GAME3D__.stackInfo(r), rid);
const screenshot = (p) => page.screenshot({ path: p });

/** finalizePins(derived) — the SVG suite's pins compare / --discharge (I-57b/c). The runner
 *  OWNS this; the svg block builds `derived` and calls it at the monolith's ordering point. */
function finalizePins(derived) {
  const pins = existsSync(PIN_FILE) ? JSON.parse(readFileSync(PIN_FILE, 'utf8')) : {};
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
}

const h = { page, check, GATE_PORT, sha, gotoStage, waitRest, glide, hashes, info, domVsLaw, screenshot, finalizePins, discharge: DISCHARGE };

// ── run the selected groups in registry order ──
for (const group of selected) {
  await group.fn(h);
}

await browser.close();
server.close();

const fails = results.filter((r) => !r.pass).length;
console.log(JSON.stringify(results, null, 2));
console.log(`\nVISUAL GATE ${results.length - fails}/${results.length}${DISCHARGE ? ' · PINS DISCHARGED' : ''}`);
process.exit(fails === 0 ? 0 : 1);
