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

// ── GD (game drills; renamed from PR-6 per K7-parity re-verify obs 1 — the PR-6 label
// belongs to the operations-pack upgrade drill): the SPATIAL GAME surface, gate-visible
// (K7-parity D3 closure); M-F-class hardcoding of the round callout MUST fail here ──
await page.goto('http://localhost:4173/game.html');
await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
// PR-6a: v1's modal sequence — preamble FIRST, then the round card, then clear (I-55a)
const seq = [await page.evaluate(() => window.__GAME__.poppedLayout())];
await page.evaluate(() => window.__GAME__.advance());
seq.push(await page.evaluate(() => window.__GAME__.poppedLayout()));
await page.evaluate(() => window.__GAME__.advance());
seq.push(await page.evaluate(() => window.__GAME__.poppedLayout()));
drill('GD1/preamble-then-round-card', seq[0] === 'boty:round-preamble' && seq[1] === 'boty:round-card' && seq[2] === null, seq.join(' → '));
// PR-6b: D2 law in-target — end a turn, reload mid-round: the callout must name the
// PROJECTED leader (≠ seat-0), never a hardcoded constant
await page.evaluate(() => { document.querySelector('[data-act="end-turn"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await page.reload();
await page.waitForFunction(() => window.__GAME__ && window.__GAME__.poppedLayout() !== null);
const preambleTxt = await page.evaluate(() => document.getElementById('popped').textContent);
const hdrTurn = await page.textContent('#hdr-turn');
const leader = hdrTurn.replace(/[▶'s turn\s]/g, '').trim() || hdrTurn;
drill('GD2/callout-derives-from-projection', /pete/.test(preambleTxt) && /pete/.test(hdrTurn) && !/moe leads/.test(preambleTxt), `hdr="${hdrTurn}" preamble="${preambleTxt.slice(0, 60)}" (${leader})`);
// PR-6c: rivals carousel opens the rival-summary child and pages
await page.evaluate(() => window.__GAME__.dismiss());
await page.click('#rivals');
const rl = await page.evaluate(() => window.__GAME__.poppedLayout());
await page.click('[data-nav="next"]');
const idx = await page.evaluate(() => document.querySelector('.pop-nav span').textContent);
await page.click('[data-nav="close"]');
drill('GD3/rivals-carousel-pages', rl === 'boty:rival-summary' && /2 \/ 3/.test(idx), `${rl} · ${idx}`);
// GD4: gallery + the filter RULE exercised against a REAL card (K7-parity re-verify
// obs 2): fresh game (viewing seat = active seat, so the draw lands in OWN discard),
// draw, then a matching chip keeps the card and a non-matching one drops it
await page.click('#new-game');
await page.evaluate(() => window.__GAME__.dismiss());
await page.evaluate(() => { document.querySelector('[data-act="draw"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await page.evaluate(() => window.__GAME__.dismiss());
await page.click('#gallery');
const note0 = await page.evaluate(() => document.querySelector('.gal-note').textContent);
await page.click('[data-chip="jobs"]'); // drawn card id contains 'job' → kept
const note1 = await page.evaluate(() => document.querySelector('.gal-note').textContent);
await page.click('[data-chip="jobs"]');
await page.click('[data-chip="global"]'); // no 'glo' in the id → dropped
const note2 = await page.evaluate(() => document.querySelector('.gal-note').textContent);
drill('GD4/gallery-filter-rule-live', /1 of 1/.test(note0) && /1 of 1.*filtered/.test(note1) && /0 of 1.*filtered/.test(note2), `${note0} → ${note1} → ${note2}`);
// GD5: the Books panel (I-56) — gate-visible from birth (the K7-parity lesson); the
// displayed balance identity must HOLD numerically, projected not invented
await page.click('[data-nav="close"]');
await page.click('#books');
const bl = await page.evaluate(() => window.__GAME__.poppedLayout());
const bookTxt = await page.evaluate(() => document.getElementById('popped').textContent);
const idm = bookTxt.match(/Assets \$(-?\d+) = Liabilities \$(-?\d+) \+ Equity \$(-?\d+)/);
const identityHolds = idm && Number(idm[1]) === Number(idm[2]) + Number(idm[3]);
drill('GD5/books-panel-identity', bl === 'boty:books' && /always balance/.test(bookTxt) && !!identityHolds, `${bl} · ${idm ? idm[0] : 'NO IDENTITY LINE'}`);
// GD5b (K7-books D3): re-check the identity at a NON-DEGENERATE state — after a
// cash-moving action, at least one component must be non-zero and the identity must
// still hold (kills sign/filter mutants a zero state masks)
await page.evaluate(() => window.__GAME__.dismiss()); // books is a plain modal — no nav chrome
await page.click('#upkeep'); // overhead charge moves cash
await page.click('#books');
const bookTxt2 = await page.evaluate(() => document.getElementById('popped').textContent);
const idm2 = bookTxt2.match(/Assets \$(-?\d+) = Liabilities \$(-?\d+) \+ Equity \$(-?\d+)/);
const holds2 = idm2 && Number(idm2[1]) === Number(idm2[2]) + Number(idm2[3]);
const nonZero = idm2 && (Number(idm2[1]) !== 0 || Number(idm2[2]) !== 0 || Number(idm2[3]) !== 0);
drill('GD5b/books-identity-nonzero-state', !!holds2 && !!nonZero, idm2 ? idm2[0] : 'NO IDENTITY LINE');
await page.evaluate(() => window.__GAME__.dismiss());
await page.evaluate(() => localStorage.clear());

await browser.close();
server.close();

const bFail = out.battery.failed;
const dFail = out.drills.filter((d) => !d.pass).length;
console.log(JSON.stringify(out, null, 2));
console.log(`\nBATTERY ${out.battery.total - bFail}/${out.battery.total} · DRILLS ${out.drills.length - dFail}/${out.drills.length}`);
process.exit(bFail + dFail === 0 ? 0 : 1);
