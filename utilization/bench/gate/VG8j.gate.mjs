// VG8j — A2: DECK + DRAW + THE READING BOARD (I-67; kill-first). The I-62b and I-63h
// standing obligations fire HERE — the first state-advancing increment. Emits VG8k
// (fortune anatomy) + VG8l (opaque reading card). SELF-SEEDING: navigates a fresh
// game3d.html (clean genesis — moe active, deck 3/discard 0 per the committed pack), then
// glides to the table, so it PASSES in isolation. Uses the bag's waitRest/info/hashes.
export const suite = '3d';
export const id = 'VG8j';

export async function run(h) {
  const { page, check, gotoStage, waitRest, info, hashes } = h;

  await gotoStage('game3d.html'); // self-seed: clean genesis (VG8a-i's theater changes nothing, but --check runs alone)
  {
    await page.evaluate(() => window.__GAME3D__.glideTo('table'));
    await waitRest('VG8j/table-glide-rest');
    const stg3 = await page.locator('#stage canvas').boundingBox();
    await page.mouse.move(stg3.x + stg3.width / 2, stg3.y + stg3.height / 2);

    // COUNT-TRUE at genesis: the committed pack says moe's deck holds 3, discard 0 —
    // the expectation is the PACK's, not the page's.
    const d0 = await info('deck');
    const c0 = await info('discard');
    const hm0 = await hashes();
    // A2b (owner: "the decks not visible"): the pile has PHYSICAL height — the top card
    // sits measurably above the bottom one (≥0.8 world units per card between them)
    const ys = d0 ? d0.top.map((t) => t.y) : [];
    const heightTrue = ys.length === 3 && (ys[2] - ys[0]) >= (d0.count - 1) * 0.8;
    check('VG8j/stacks-count-true', d0 && c0 && d0.count === 3 && c0.count === 0 && heightTrue,
      `deck:${d0?.count} (want 3, the committed genesis) · discard:${c0?.count} (want 0) · height-true:${heightTrue} (Δy ${ys.length ? (ys[2] - ys[0]).toFixed(2) : '?'})`);

    // THE DRAW — a REAL click on the deck; the gate then WAITS ON STATE (drawPhase)
    const dxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.click(dxy.x, dxy.y);
    // K7-A2 D1 (re-cut at D7): a SECOND deck click lands GENUINELY mid-flight — wait on
    // STATE (drawPhase left 'idle') PLUS one rendered frame (matrixWorld fresh), never
    // clocks (I-60f), so the second raycast really hits the deck. One theater at a time:
    // the second click must change NOTHING (exactly one draw: moves +1, deck −1, one onion).
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() !== 'idle', null, { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    await page.mouse.click(dxy.x, dxy.y);
    let flightDone = true;
    try { await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'reading', null, { timeout: 60000 }); }
    catch { flightDone = false; }
    if (!flightDone) {
      check('VG8j/draw-theater-hk11', false, 'draw flight never reached the reading board (timeout)');
    } else {
      const o1 = await page.evaluate(() => window.__GAME3D__.onionState());
      const oa = await page.evaluate(() => window.__GAME3D__.onionRegions()); // A3/I-69: anatomy while the board is OPEN
      const d1 = await info('deck');
      const c1 = await info('discard');
      const hm1 = await hashes();
      // K7-A2 D2: close by clicking the DECK's own screen position — the close click is
      // CONSUMED (no raycast beneath: no draw, no fidget, no re-anchor from this click)
      const dxyClose = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
      await page.mouse.click(dxyClose.x, dxyClose.y);
      const closed = await page.evaluate(() => ({ o: window.__GAME3D__.onionState().open, p: window.__GAME3D__.drawPhase(), z: window.__GAME3D__.zoomState() }));
      const hmClose = await hashes();
      const dClose = await info('deck');
      const consumed = hmClose.m === hm1.m && hmClose.h === hm1.h && dClose.count === d1.count && dClose.fidget === d1.fidget;
      check('VG8j/draw-theater-hk11',
        o1.open === true && o1.title === 'job-posting' && o1.verdict && o1.verdict.mismatch === false
        && d1.count === 2 && c1.count === 1 && c1.topFace === 'job-posting'
        && hm1.m === hm0.m + 1 && hm1.h !== hm0.h
        && closed.o === false && closed.p === 'idle' && consumed,
        `onion:${o1.open}/${o1.title} mismatch:${o1.verdict?.mismatch} · deck ${d0.count}→${d1.count} · discard ${c0.count}→${c1.count} top:${c1.topFace} · moves ${hm0.m}→${hm1.m} (double-click made ONE) · hash-changed:${hm1.h !== hm0.h} · closed:${closed.o === false} · close-consumed:${consumed}`);

      // VG8k — A3 (I-69): the reading board presents the FORTUNE ANATOMY, not A2's text
      // panel. Art-dominance is a RENDERED property (I-57a): art.h > title.h AND inside the
      // measured 55–70% band (the EXT-5 F1 law carried into 3D). The card is front/back
      // (the spike-proven card()). Fills MIRROR the certified SVG bench (title = the seeded
      // card, subtitle 'Fortune', a non-empty effect line). Captured while the board was OPEN.
      const wantIds = ['art', 'payout', 'subtitle', 'text', 'title'];
      const idsOk = oa && JSON.stringify(oa.ids) === JSON.stringify(wantIds);
      // NULL-GUARDED so a MUTANT that drops a region (e.g. the front face) fails CLEANLY by
      // name (pass:false), never crashes the gate — the anatomy-absent leg's live falsifier.
      const artFrac = oa && oa.cardH && oa.regions.art ? oa.regions.art.h / oa.cardH : 0;
      const artDominant = !!(oa && oa.regions.art && oa.regions.title && oa.regions.art.h > oa.regions.title.h && artFrac >= 0.55 && artFrac <= 0.70);
      const fillsOk = !!(oa && JSON.stringify(oa.regions.title?.lines) === JSON.stringify(['job-posting'])
        && JSON.stringify(oa.regions.subtitle?.lines) === JSON.stringify(['Fortune'])
        && Array.isArray(oa.regions.text?.lines) && oa.regions.text.lines.length >= 1);
      check('VG8k/fortune-anatomy', !!(idsOk && artDominant && oa.hasBack && fillsOk),
        oa ? `regions:[${oa.ids.join(',')}] · art/title:${oa.regions.art?.h?.toFixed(1)}>${oa.regions.title?.h?.toFixed(1)} artFrac:${artFrac.toFixed(3)}(band .55–.70) · front/back:${oa.hasBack} · fills[title=${JSON.stringify(oa.regions.title?.lines)} sub=${JSON.stringify(oa.regions.subtitle?.lines)} text#${oa.regions.text?.lines?.length ?? 0}]` : 'onionRegions null — board not open (anatomy absent)');

      // VG8l — A3b (I-70, owner playtest): the reading card must be OPAQUE OVER the 55% veil.
      // three.js renders the whole opaque pass before the transparent one, so an OPAQUE card
      // draws first and the veil paints over it ("the card looks transparent"). The fix puts
      // the card in the transparent pass at full opacity, sorted above the veil. Asserted as
      // material/order STATE (not pixels — I-57c): every face opacity 1 + transparent-pass +
      // renderOrder above the veil. Kill-first: opacity<1, or transparent:false (the reported
      // bug — card back in the opaque pass), or renderOrder ≤ veil each fail this by name.
      check('VG8l/fortune-opaque', !!(oa && oa.opaque && oa.overVeil),
        oa ? `opaque:${oa.opaque} (minOpacity ${oa.minOpacity} · transparent-pass:${oa.transparentPass}) · over-veil:${oa.overVeil} (card order ${oa.cardOrder} > veil ${oa.veilOrder})` : 'onionRegions null — board not open');

      // FORCED MISMATCH (the VG7d committed-drill precedent): HK-11 flags, TRUTH WINS
      await page.evaluate(() => window.__GAME3D__.forceFlipMismatch(true));
      const dxy2 = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
      await page.mouse.click(dxy2.x, dxy2.y);
      let f2 = true;
      try { await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'reading', null, { timeout: 60000 }); }
      catch { f2 = false; }
      const o2 = f2 ? await page.evaluate(() => window.__GAME3D__.onionState()) : null;
      await page.mouse.click(stg3.x + stg3.width / 2, stg3.y + stg3.height / 2);
      const c2 = await info('discard');
      const ownDiscardTrue = c2.count === 2 && c2.topFace === 'new-van'; // K7-A2 D3: the VIEWER'S ownDiscard, both cards
      check('VG8j/forced-mismatch-truth-wins',
        f2 && o2 && o2.verdict && o2.verdict.mismatch === true && o2.verdict.displayed === 'WRONG-CARD'
        && o2.verdict.seeded === 'new-van' && o2.title === 'new-van' && ownDiscardTrue,
        f2 ? `flagged:${o2.verdict?.mismatch} displayed:${o2.verdict?.displayed} seeded:${o2.verdict?.seeded} · shown:${o2.title} (truth wins) · own-discard:${c2.count}/${c2.topFace}` : 'second flight never landed (timeout)');

      // FIDGET = PURE THEATER (I-67e): three discard clicks cycle loose → spread → NEAT
      // EXACT; rowHash AND moveCount are invariant through every fidget click.
      const hm2 = await hashes();
      const p0 = (await info('discard')).top;
      const states = [];
      for (let i = 0; i < 3; i++) {
        const rxy2 = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.click(rxy2.x, rxy2.y);
        states.push(await info('discard'));
      }
      const hm3 = await hashes();
      const posEq = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v.x - b[i].x) < 1e-9 && Math.abs(v.y - b[i].y) < 1e-9 && Math.abs(v.z - b[i].z) < 1e-9);
      const moved1 = !posEq(states[0].top, p0);
      const moved2 = !posEq(states[1].top, states[0].top);
      const restored = posEq(states[2].top, p0) && states[2].fidget === 0;
      const pure = hm3.h === hm2.h && hm3.m === hm2.m;
      check('VG8j/fidget-pure-theater', moved1 && moved2 && restored && pure,
        `peek-moved:${moved1} · spread-moved:${moved2} · neat-restored-exact:${restored} · rowHash+moves-invariant:${pure}`);

      // END-TURN + the I-62b OBLIGATION: after real state change the frozen-panel class
      // dies — standings (★ moves), chrome, log, and the deck (now PETE's, 2 by the pack)
      await page.click('#end-btn');
      const after = await page.evaluate(() => ({
        v: window.__GAME3D__.viewData(),
        standings: window.__GAME3D__.stamped('standings'),
        log: window.__GAME3D__.stamped('log'),
        hdr: document.getElementById('hdr').textContent,
      }));
      const ranked2 = [...after.v.seats].sort((a, b) => b.cash - a.cash);
      const wantStandings = ['THE TABLE', ...ranked2.map((x) => `${x.id === after.v.active ? '★ ' : ''}${x.id}  $${x.cash}`)];
      const standingsOk = JSON.stringify(after.standings) === JSON.stringify(wantStandings) && after.v.active === 'pete';
      const hdrOk = after.hdr.includes(`${after.v.active}'s turn`);
      const logOk = after.log && after.log.some((l) => l === 'moe · turn:end') && after.log.some((l) => l === 'moe · deck:draw'); // the engine's intent type names
      const d2 = await info('deck');
      const deckIsPetes = d2.count === 2; // the committed pack: pete's deck holds 2
      const c3 = await info('discard');
      const ownDiscardHeld = c3.count === 2 && c3.topFace === 'new-van'; // K7-A2 D3: ownDiscard is the VIEWER'S — invariant across the turn change
      // deck fidget when NOT the viewer's turn (I-67d): a deck click must NOT draw
      const hm4 = await hashes();
      const dxy3 = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
      await page.mouse.click(dxy3.x, dxy3.y);
      const dFid = await info('deck');
      const hm5 = await hashes();
      const fidgetNotDraw = dFid.fidget === 1 && hm5.h === hm4.h && hm5.m === hm4.m && dFid.count === 2;
      check('VG8j/state-change-recheck', standingsOk && hdrOk && logOk && deckIsPetes && ownDiscardHeld && fidgetNotDraw,
        `active:${after.v.active} · standings-rederived:${standingsOk} · hdr:${hdrOk} · log(end-turn+draw):${logOk} · deck-now-petes(2):${deckIsPetes} · own-discard-held:${ownDiscardHeld} · deck-fidget-not-draw:${fidgetNotDraw}`);
    }
    await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  }
}
