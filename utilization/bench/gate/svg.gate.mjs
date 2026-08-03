// SVG SUITE (VG1–VG6) — the certified SVG bench (game.html/showcase.html) measured against
// the LayoutDef contracts + the computed pins (this suite OWNS the pins). Self-seeding: it
// navigates game.html and runs the canonical reset itself. The runner owns the pins
// compare / --discharge (h.finalizePins) — this block builds `derived` and calls it at the
// monolith's ordering point (after showcase, before VG4/VG5). Names/details are identical
// to the monolith; the pins are BYTE-UNCHANGED by construction (same innerHTML → same sha).
export const suite = 'svg';
export const id = 'svg';

export async function run(h) {
  const { page, check, GATE_PORT, sha, domVsLaw, screenshot, finalizePins } = h;

  // ── the canonical deterministic state: fresh seeded game · popups dismissed · overview ──
  await page.goto(`http://localhost:${GATE_PORT}/game.html`);
  await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForFunction(() => window.__GAME__ && window.__GAME__.rowHash() !== null);
  await page.evaluate(() => window.__GAME__.dismiss());
  await page.evaluate(() => window.__GAME__.setCamera('overview'));

  // VG1 — the live table scene against the law
  const vg1 = await domVsLaw('#stage');
  check('VG1/scene-dom-vs-law', vg1.length === 0, vg1.slice(0, 4).join(' | ') || 'all regions ≡ law');
  await screenshot('/tmp/vg-scene.png');

  // VG2 — computed scene pins (I-57b)
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
  await screenshot('/tmp/vg-books.png');
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
  await screenshot('/tmp/vg-fortune.png');
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
  await page.goto(`http://localhost:${GATE_PORT}/showcase.html`);
  await page.waitForFunction(() => document.getElementById('stage')?.innerHTML.length > 0);
  derived['scene:showcase'] = sha(await page.evaluate(() => document.getElementById('stage').innerHTML));
  await screenshot('/tmp/vg-showcase.png');

  // VG2/pins — the runner-owned compare / --discharge, at the monolith's ordering point.
  finalizePins(derived);

  // VG4 — camera purity in-DOM (GX-39 family), K7-vg D1 closure: the camera must
  // PROVABLY MOVE (table ≠ overview — a dead setCamera can no longer compare a viewBox
  // to itself) and then re-derive byte-equal on the same preset.
  await page.goto(`http://localhost:${GATE_PORT}/game.html`);
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
}
