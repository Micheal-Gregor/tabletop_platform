// FOUNDRY SHOT — build + serve + screenshot from named camera poses (RECIPE stage E).
// The visual loop's actuator: renders the LIVE bench in real Chromium and writes the
// shots the agent judges against targets/<piece>/concept-*.png. Screenshots are human
// artifacts, never compared mechanically (I-57c) — the judging is vision, the pinning
// (when the loop converges) is the VG layout gate's job, not this tool's.
//
//   node utilization/foundry/harness/shot.mjs --piece=die [--poses=overview,seat-0]
//     [--page=game3d.html] [--no-build] [--settle-ms=900] [--out=DIR]
//
// Poses are __GAME3D__ camera presets, driven through the gate surface the bench
// already exposes (glideTo/gliding — I-62d): no bench code is touched. Output:
// utilization/foundry/shots/<piece>/<pose>.png (gitignored).
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url)); // …/utilization/foundry/harness
const BENCH = join(dirname(dirname(HERE)), 'bench');  // …/utilization/bench
const argv = process.argv.slice(2);
const opt = (flag, dflt) => {
  const a = argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? a.split('=')[1] : dflt;
};
const PIECE = opt('piece', null);
if (!PIECE) { console.error('usage: node shot.mjs --piece=<name> [--poses=overview,seat-0] [--page=game3d.html] [--no-build] [--settle-ms=900] [--out=DIR]'); process.exit(2); }
const POSES = opt('poses', 'overview').split(',').map((s) => s.trim()).filter(Boolean);
const PAGE = opt('page', 'game3d.html');
const SETTLE_MS = Number(opt('settle-ms', '900'));
const OUT = opt('out', join(dirname(HERE), 'shots', PIECE));
const PORT = Number(process.env.SHOT_PORT) || 4175;

// ── build the bench (same entry as gate:visual), unless --no-build ──
if (!argv.includes('--no-build')) {
  const r = spawnSync(process.execPath, [join(BENCH, 'build.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ── static server over the bench root (the gate runner's MIME shape) ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = join(BENCH, req.url === '/' ? PAGE : req.url.split('?')[0]);
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'text/plain' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(PORT, r));

// ── chromium, with the G-1 friendly failure (I-101) ──
const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
if (!existsSync(exe)) {
  console.error(`SHOT: no Chromium executable at "${exe}". Set PLAYWRIGHT_CHROMIUM_PATH to your browser first.`);
  server.close();
  process.exit(2);
}
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
await page.goto(`http://localhost:${PORT}/${PAGE}`);
await page.waitForFunction(() => window.__GAME3D__?.ready?.() === true, null, { timeout: 30_000 });
await page.waitForTimeout(SETTLE_MS); // first paint + arrivals

mkdirSync(OUT, { recursive: true });
const shots = [];
for (const pose of POSES) {
  const known = await page.evaluate((n) => {
    const g = window.__GAME3D__;
    if (!g?.glideTo) return false;
    try { g.glideTo(n); return true; } catch { return false; }
  }, pose);
  if (!known) { console.error(`✗ pose "${pose}" — glideTo refused it (unknown preset?)`); continue; }
  await page.waitForFunction(() => window.__GAME3D__.gliding?.() === false, null, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(250); // rest at the pose
  const file = join(OUT, `${pose}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
  console.log(`✓ ${pose} → ${file}`);
}
await browser.close();
server.close();
console.log(`SHOT ${PIECE}: ${shots.length}/${POSES.length} poses → ${OUT}`);
process.exit(shots.length === POSES.length ? 0 : 1);
