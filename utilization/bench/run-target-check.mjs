// W-OBS runner: serve the bench, drive REAL CHROMIUM, collect the K8 in-target battery
// (PR-3/PR-4) + the PR-5 fail-safety drills + a PR-3 live-bench smoke.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = new URL('.', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'text/plain' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(4173, r));

const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });

const page = await browser.newPage();
const out = { battery: null, drills: [] };
const drill = (name, pass, detail = '') => out.drills.push({ name, pass, detail });

// ── PR-3/PR-4: the in-target battery page ──
await page.goto('http://localhost:4173/verify.html');
await page.waitForFunction(() => window.__K8__ && window.__K8__.done, null, { timeout: 120000 });
out.battery = await page.evaluate(() => window.__K8__);

// ── PR-5 drills + PR-3 live-bench smoke on the REAL bench ──
await page.goto('http://localhost:4173/index.html');
await page.waitForFunction(() => window.__BENCH__ && window.__BENCH__.rowHash() !== null);
// smoke: a legal move logs; an ILLEGAL one refuses and does not log (HK-1 live in the bench)
const m0 = await page.evaluate(() => window.__BENCH__.moveCount());
await page.click('#upkeep');
const m1 = await page.evaluate(() => window.__BENCH__.moveCount());
drill('PR3/bench-legal-move-logs', m1 === m0 + 1, `moves ${m0}→${m1}`);
await page.click('#reckon'); // illegal now (not closing) — must refuse, not halt, not log
const m2 = await page.evaluate(() => window.__BENCH__.moveCount());
const statusTxt = await page.textContent('#status');
drill('PR3/bench-illegal-refused-unlogged', m2 === m1 && /refused/.test(statusTxt), statusTxt.slice(0, 80));
// PR-5a kill/restart: reload — the autosaved row must resume to the SAME hash (replay-verified)
const h1 = await page.evaluate(() => window.__BENCH__.rowHash());
await page.reload();
await page.waitForFunction(() => window.__BENCH__ && window.__BENCH__.rowHash() !== null);
const h2 = await page.evaluate(() => window.__BENCH__.rowHash());
drill('PR5/kill-restart-resume', h1 === h2, `hash ${h1 === h2 ? 'stable' : 'DIVERGED'}`);
// PR-5b corruption: garbage save → HALT banner, nothing loaded, never repaired
await page.evaluate(() => { localStorage.setItem('tabletop.bench.save', '{"format":"tabletop-row-v1","row":42}'); });
await page.reload();
await page.waitForSelector('#halt', { state: 'visible', timeout: 10000 });
const haltTxt = await page.textContent('#halt');
drill('PR5/corrupt-save-halts', /HALT/.test(haltTxt) && /refused whole|invalid/.test(haltTxt), haltTxt.slice(0, 90));
// PR-5c tamper (hash-lineage / PC-9-in-target): flip a stored move → replay hash mismatch → flagged, not loaded
await page.evaluate(() => { localStorage.removeItem('tabletop.bench.save'); });
await page.reload();
await page.waitForFunction(() => window.__BENCH__ && window.__BENCH__.rowHash() !== null);
await page.click('#upkeep');
await page.evaluate(() => {
  const env = JSON.parse(localStorage.getItem('tabletop.bench.save'));
  env.row.moves[0].args.overhead = 999; // the tamper
  localStorage.setItem('tabletop.bench.save', JSON.stringify(env));
});
await page.reload();
await page.waitForSelector('#halt', { state: 'visible', timeout: 10000 });
const tamperTxt = await page.textContent('#halt');
drill('PR5/tampered-row-flagged', /HALT|Divergence|lineage/.test(tamperTxt), tamperTxt.slice(0, 90));
await page.evaluate(() => localStorage.clear());

await browser.close();
server.close();

const bFail = out.battery.failed;
const dFail = out.drills.filter((d) => !d.pass).length;
console.log(JSON.stringify(out, null, 2));
console.log(`\nBATTERY ${out.battery.total - bFail}/${out.battery.total} · DRILLS ${out.drills.length - dFail}/${out.drills.length}`);
process.exit(bFail + dFail === 0 ? 0 : 1);
