// VG8j — A2: DECK + DRAW + THE READING BOARD (I-67; kill-first). The I-62b and I-63h
// standing obligations fire HERE — the first state-advancing increment. Emits VG8k
// (fortune anatomy) + VG8l (opaque reading card). SELF-SEEDING: navigates a fresh
// game3d.html (clean genesis — moe active, deck 36/discard 0 per the committed Q-1 pack), then
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

    // COUNT-TRUE at genesis: the committed pack says moe's deck holds 36 — the Q-1 full
    // set (I-88: one of every card, 3 + 33), discard 0 — the expectation is the PACK's,
    // not the page's (a wrong pack edit fails HERE by name).
    const d0 = await info('deck');
    const c0 = await info('discard');
    const hm0 = await hashes();
    // A2b (owner: "the decks not visible"): the pile has PHYSICAL height. stackInfo
    // samples the TOP FIVE cards, so the law is per-card spacing over the sample:
    // strictly stacked, ≥0.8 world units per card (I-88 re-anchor — the old whole-pile
    // formula was valid only while count ≤ 5).
    const ys = d0 ? d0.top.map((t) => t.y) : [];
    const wantSample = d0 ? Math.min(5, d0.count) : 0;
    const heightTrue = ys.length === wantSample && ys.length >= 2
      && ys.every((y, i) => i === 0 || y > ys[i - 1])
      && (ys[ys.length - 1] - ys[0]) >= (ys.length - 1) * 0.8;
    check('VG8j/stacks-count-true', d0 && c0 && d0.count === 36 && c0.count === 0 && heightTrue,
      `deck:${d0?.count} (want 36, the committed Q-1 genesis) · discard:${c0?.count} (want 0) · height-true:${heightTrue} (sample ${ys.length}, Δy ${ys.length ? (ys[ys.length - 1] - ys[0]).toFixed(2) : '?'})`);

    // v2-table-arrangement (T-1, I-89 — the owner's v1-board ruling as def law + the pile
    // exhibits): season art-banner TOP-LEFT · GLOBAL CARDS IN PLAY to its RIGHT (top band)
    // · standings UNDER the season · deck/discard/tradespeople/equipment in their pile row
    // · AND the two A16 pile stacks exist as 6-card staged exhibits at their regions.
    // Kill: a def regression (move/remove a region) or a missing pile fails BY NAME.
    {
      const tp = await info('tradespeople-pile');
      const eq = await info('equipment-pile');
      const lay = await page.evaluate(() => window.__GAME3D__.tableRegionRects());
      let arrOk = false, arrDetail = 'NO-REGION-RECTS-SURFACE';
      if (lay) {
        const r = Object.fromEntries(lay.map((x) => [x.id, x]));
        const season = r['art-banner'], glob = r['global-play'], stand = r['standings'];
        const row = ['deck', 'discard', 'tradespeople-pile', 'equipment-pile'].map((id) => r[id]);
        const seasonTL = season && season.x <= 4 && season.y <= 4;
        const globRight = glob && season && glob.x >= season.x + season.w && glob.y <= 4;
        const standUnder = stand && season && stand.x === season.x && stand.y >= season.y + season.h;
        const rowOk = row.every((x) => x) && row.every((x, i) => i === 0 || x.x > row[i - 1].x) && row.every((x) => x.y === row[0].y);
        arrOk = !!(seasonTL && globRight && standUnder && rowOk);
        arrDetail = `season-top-left:${!!seasonTL} · global-right-of-season:${!!globRight} · standings-under-season:${!!standUnder} · pile-row:${!!rowOk}`;
      }
      const pilesOk = tp && eq && tp.count === 6 && eq.count === 6;
      check('VG8j/v2-table-arrangement', arrOk && !!pilesOk,
        `${arrDetail} · tradespeople-pile:${tp?.count} equipment-pile:${eq?.count} (want 6·6 staged exhibits)`);
    }

    // draw-weak-flick (Q-2b, I-91 — the owner's "if the card isn't flicked hard enough,
    // it just stays face down on the pile"): a SLOW 6-px drag on the deck grabs the top
    // card but does NOT draw — verdict 'weak', deck count + rowHash + moveCount invariant,
    // no onion. The slow waits SHAPE the input (gesture definition); every ASSERTION still
    // waits on STATE (I-60f). Kill: threshold 0 → every touch draws → false.
    {
      const hmW = await hashes();
      const wxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
      await page.mouse.move(wxy.x, wxy.y);
      await page.mouse.down();
      await page.mouse.move(wxy.x + 3, wxy.y - 2);
      await page.waitForTimeout(400); // input shape: a lazy drag
      await page.mouse.move(wxy.x + 6, wxy.y - 4);
      await page.mouse.up();
      await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
      const g0 = await page.evaluate(() => window.__GAME3D__.drawGesture());
      const dW = await info('deck');
      const hmW1 = await hashes();
      const onionW = await page.evaluate(() => window.__GAME3D__.onionState().open);
      const weakOk = !!g0 && g0.verdict === 'weak' && g0.velocity < g0.threshold
        && dW.count === 36 && hmW1.m === hmW.m && hmW1.h === hmW.h && onionW === false;
      check('VG8j/draw-weak-flick', weakOk,
        `verdict:${g0?.verdict} (v ${g0?.velocity?.toFixed?.(3)} < T ${g0?.threshold}) · deck:${dW?.count} (still 36) · moves/hash invariant:${hmW1.m === hmW.m && hmW1.h === hmW.h} · onion stayed closed:${onionW === false} — the card settled back face down, NO draw`);
    }

    // THE DRAW — Q-2b (I-91): a REAL GRAB + FLICK on the deck's top card (down → fast
    // moves → up; velocity far above the threshold); the gate then WAITS ON STATE.
    const dxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(dxy.x + i * 12, dxy.y - i * 10);
    await page.mouse.up();
    // K7-A2 D1 (re-cut at D7): a SECOND deck click lands GENUINELY mid-flight — wait on
    // STATE (drawPhase left 'idle') PLUS one rendered frame (matrixWorld fresh), never
    // clocks (I-60f), so the second raycast really hits the deck. One theater at a time:
    // the second click must change NOTHING (exactly one draw: moves +1, deck −1, one onion).
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() !== 'idle', null, { timeout: 60000 }).catch(() => {});
    // draw-flip-not-fly (Q-2, I-90 — the owner's "it just displays the card"): DURING the
    // pre-reading theater the flip card sits AT THE DECK (a small in-place lift), never
    // traveling toward the camera. Kill: restore the flight destination → distance grows
    // to hundreds of world units → false.
    const th = await page.evaluate(() => window.__GAME3D__.drawTheater());
    let flipAtPile = false, flipDetail = 'NO-THEATER (missed the flip window)';
    if (th && th.card && th.deck) {
      const d = Math.hypot(th.card.x - th.deck.x, th.card.y - th.deck.y, th.card.z - th.deck.z);
      flipAtPile = d < 40;
      flipDetail = `phase ${th.phase} · |card−deck| ${d.toFixed(1)} (<40 — flipping IN PLACE, no flight)`;
    }
    check('VG8j/draw-flip-not-fly', flipAtPile, flipDetail);
    // one theater at a time (K7-A2 D1 carried into Q-2b): a second interaction mid-flip
    // changes NOTHING (the grab guard refuses; clicks no longer draw) — exactly one draw.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    await page.mouse.click(dxy.x, dxy.y);
    let flightDone = true;
    try { await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'reading', null, { timeout: 60000 }); }
    catch { flightDone = false; }
    if (!flightDone) {
      check('VG8j/draw-theater-hk11', false, 'the flip never reached the reading board (timeout)');
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
      // Q-2 (I-90): the close starts the ROUTE — observe it (never a teleport), then wait
      // on the cycle's END state (routing → idle; state, never clocks — I-60f).
      let routeObserved = false;
      try { await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'routing', null, { timeout: 8000 }); routeObserved = true; }
      catch { routeObserved = (await page.evaluate(() => window.__GAME3D__.drawPhase())) === 'idle' && !!(await page.evaluate(() => window.__GAME3D__.lastRoute())); }
      await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
      const routeRec = await page.evaluate(() => window.__GAME3D__.lastRoute());
      const routeEndOk = !!routeRec && routeRec.dest === 'discard'
        && Math.hypot(routeRec.endX - routeRec.targetX, routeRec.endY - routeRec.targetY, routeRec.endZ - routeRec.targetZ) < 20;
      check('VG8j/route-to-discard', routeObserved && routeEndOk,
        `route-observed:${routeObserved} · dest:${routeRec?.dest} · end≈target:${routeEndOk} — the card TRAVELS to the discard (no teleport)`);

      // slot-partition-law (Q-2c, I-92): the family DATA is pinned (a map regression fails
      // here) and the DERIVED VIEW sums — pile + global + session ≡ ownDiscard. At this
      // state: one drawn card (job-posting → the pile), slots empty. LIVE global/session
      // routing seals at playtest; the drill-state re-kill TRIGGER is carried on I-92.
      const fam = await page.evaluate(() => ({
        g: window.__GAME3D__.cardFamily('gbl-boom'),
        s: window.__GAME3D__.cardFamily('svc-marketing'),
        d: window.__GAME3D__.cardFamily('job-posting'),
        levy: window.__GAME3D__.cardFamily('town-levy'),
      }));
      const pv = await page.evaluate(() => window.__GAME3D__.partitionView());
      const famOk = fam.g === 'global' && fam.s === 'session' && fam.d === 'discard' && fam.levy === 'global';
      const sumOk = !!pv && pv.global.length + pv.session.length + pv.pile.length === pv.total && pv.total === 1 && pv.pile[0] === 'job-posting';
      check('VG8j/slot-partition-law', famOk && sumOk,
        `family{gbl-boom:${fam.g} svc-marketing:${fam.s} job-posting:${fam.d} town-levy:${fam.levy}} · partition sums:${sumOk} (${pv?.pile?.length}+${pv?.global?.length}+${pv?.session?.length}=${pv?.total})`);

      // ── Q-6 (I-94): THE LIVE DISCARD (the pile now holds job-posting, face up) ──
      // discard-toss-return: a REAL slow 130-px drag pulls the top card OFF the pile
      // (scene-attached — the same object), release → LOOSE (the couple-seconds hold,
      // waited as STATE) → glides back to its EXACT slot in pile order; state invariant.
      {
        const hmT = await hashes();
        const d0q = await info('discard');
        const top0 = d0q.top[d0q.top.length - 1];
        const txy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.move(txy.x, txy.y);
        await page.mouse.down();
        await page.mouse.move(txy.x + 50, txy.y - 25);
        await page.waitForTimeout(350); // slow input shape — below the flick threshold
        await page.mouse.move(txy.x + 130, txy.y - 60);
        await page.mouse.up();
        let loose = false;
        try { await page.waitForFunction(() => window.__GAME3D__.discardGesture() === 'loose', null, { timeout: 8000 }); loose = true; } catch { /* named below */ }
        await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 120000 }).catch(() => {});
        const d1q = await info('discard');
        const top1 = d1q.top[d1q.top.length - 1];
        const back = !!(top0 && top1) && Math.hypot(top1.x - top0.x, top1.y - top0.y, top1.z - top0.z) < 3;
        const hmT1 = await hashes();
        check('VG8j/discard-toss-return', loose && back && d1q.count === d0q.count && hmT1.m === hmT.m && hmT1.h === hmT.h,
          `loose-observed:${loose} · back-at-slot:${back} (Δ ${top0 && top1 ? Math.hypot(top1.x - top0.x, top1.y - top0.y, top1.z - top0.z).toFixed(2) : '?'}) · count ${d0q.count}→${d1q.count} · state-invariant:${hmT1.m === hmT.m && hmT1.h === hmT.h}`);
      }

      // discard-flick-reads: a FAST flick on the pile card opens the reading board on
      // THAT card (the deck's mechanics mirrored); a corner click closes (no route — the
      // draw phase is idle); the card is home again.
      {
        const fxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.move(fxy.x, fxy.y);
        await page.mouse.down();
        for (let i = 1; i <= 4; i++) await page.mouse.move(fxy.x + i * 14, fxy.y - i * 10);
        await page.mouse.up();
        let opened = false;
        try { await page.waitForFunction(() => window.__GAME3D__.onionState().open === true, null, { timeout: 8000 }); opened = true; } catch { /* named below */ }
        const oTitle = await page.evaluate(() => window.__GAME3D__.onionState().title);
        const fr = await page.evaluate(() => window.__GAME3D__.discardFlickRead());
        const stgQ = await page.locator('#stage canvas').boundingBox();
        await page.mouse.click(stgQ.x + 20, stgQ.y + 20);
        await page.waitForFunction(() => window.__GAME3D__.onionState().open === false, null, { timeout: 60000 }).catch(() => {});
        await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 60000 }).catch(() => {});
        check('VG8j/discard-flick-reads', opened && oTitle === 'job-posting' && !!fr && fr.cardId === 'job-posting',
          `onion:${opened}/${oTitle} · flick-read:${fr?.cardId} — the same mechanics read the pile`);
      }

      // discard-fidget-animates: a plain CLICK cycles the 3-step fidget with the cards
      // TWEENING to the new poses (a transition STATE is observed — never a snap).
      {
        const cxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.click(cxy.x, cxy.y);
        let transitioning = false;
        try { await page.waitForFunction(() => window.__GAME3D__.discardTransitioning() === true, null, { timeout: 8000 }); transitioning = true; } catch { /* named below */ }
        await page.waitForFunction(() => window.__GAME3D__.discardTransitioning() === false, null, { timeout: 60000 }).catch(() => {});
        const f1 = await info('discard');
        check('VG8j/discard-fidget-animates', transitioning && f1.fidget === 1 && f1.count === 1,
          `transition-observed:${transitioning} (the cards MOVED, no snap) · fidget-state:${f1?.fidget} · count:${f1?.count}`);
      }

      // discard-multi-card (Q-6b, I-95 — THE OWNER'S EXACT SCENARIO: "drag some cards out
      // of the way and then flick a card I couldn't reach before, it should pop open"):
      // a second flick-draw fills the pile to 2 (new-van routes in); drag the TOP card
      // away slowly → LOOSE; WHILE it is loose, grab + FLICK the card underneath → the
      // reading board OPENS on it, one card still out. Kill: restore the single-gesture
      // lock → the under-card flick is refused → no onion → false.
      {
        const d2xy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
        await page.mouse.move(d2xy.x, d2xy.y);
        await page.mouse.down();
        for (let i = 1; i <= 4; i++) await page.mouse.move(d2xy.x + i * 12, d2xy.y - i * 10);
        await page.mouse.up();
        await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'reading', null, { timeout: 60000 }).catch(() => {});
        const stg2 = await page.locator('#stage canvas').boundingBox();
        await page.mouse.click(stg2.x + 20, stg2.y + 20); // close → routes new-van to the pile
        await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
        const dM = await info('discard');
        // drag the TOP card (new-van) out of the way — slow → LOOSE
        const mxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.move(mxy.x, mxy.y);
        await page.mouse.down();
        await page.mouse.move(mxy.x + 60, mxy.y + 30);
        await page.waitForTimeout(350);
        await page.mouse.move(mxy.x + 150, mxy.y + 70);
        await page.mouse.up();
        let loose2 = false;
        try { await page.waitForFunction(() => window.__GAME3D__.discardGesture() === 'loose', null, { timeout: 8000 }); loose2 = true; } catch { /* named below */ }
        // WHILE it is loose: grab + FLICK the card underneath (job-posting, now reachable)
        await page.mouse.move(mxy.x, mxy.y);
        await page.mouse.down();
        for (let i = 1; i <= 4; i++) await page.mouse.move(mxy.x + i * 14, mxy.y - i * 10);
        await page.mouse.up();
        let popped = false;
        try { await page.waitForFunction(() => window.__GAME3D__.onionState().open === true, null, { timeout: 8000 }); popped = true; } catch { /* named below */ }
        const oT2 = await page.evaluate(() => window.__GAME3D__.onionState().title);
        const poolAt = await page.evaluate(() => window.__GAME3D__.discardPool());
        await page.mouse.click(stg2.x + 20, stg2.y + 20); // close the reading
        await page.waitForFunction(() => window.__GAME3D__.onionState().open === false, null, { timeout: 60000 }).catch(() => {});
        await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 180000 }).catch(() => {});
        const dEnd = await info('discard');
        check('VG8j/discard-multi-card', loose2 && popped && oT2 === 'job-posting' && poolAt >= 2 && dM.count === 2 && dEnd.count === 2,
          `top-card-loose:${loose2} · under-card flick POPPED:${popped}/${oT2} (want job-posting) · cards-out-at-once:${poolAt} · pile ${dM?.count}→${dEnd?.count} (want 2→2)`);
      }
      const closed = await page.evaluate(() => ({ o: window.__GAME3D__.onionState().open, p: window.__GAME3D__.drawPhase(), z: window.__GAME3D__.zoomState() }));
      const hmClose = await hashes();
      const dClose = await info('deck');
      const consumed = hmClose.m === hm1.m && hmClose.h === hm1.h && dClose.count === d1.count && dClose.fidget === d1.fidget;
      check('VG8j/draw-theater-hk11',
        o1.open === true && o1.title === 'job-posting' && o1.verdict && o1.verdict.mismatch === false
        && d1.count === d0.count - 1 && c1.count === 1 && c1.topFace === 'job-posting'
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
