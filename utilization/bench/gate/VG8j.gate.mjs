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
    // P-3 (I-131): every card pin below DERIVES from the implementation's seeded
    // per-seat order (the vector discipline — computed, never hand-written).
    const DRAW = await page.evaluate(() => window.__GAME3D__.deckOrder('moe'));
    let extraDrawsA8 = 0; // draws the decide leg adds beyond the drill's two
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
    check('VG8j/stacks-count-true', d0 && c0 && d0.count === DRAW.length && c0.count === 0 && heightTrue, // O-4: the deck count DERIVES (34 — the in-play pair starts out); the PILE stays 0 (both genesis cards are in-play families)
      `deck:${d0?.count} (want ${DRAW.length} — the genesis draw, I-138/O-4) · discard-pile:${c0?.count} (want 0) · height-true:${heightTrue} (sample ${ys.length}, Δy ${ys.length ? (ys[ys.length - 1] - ys[0]).toFixed(2) : '?'})`);

    // deck-tap-nudge (R-1a2, I-110 + R-1a3, I-111 — the owner's STACK PROOF + the
    // third-tap RE-CENTER "so the pile doesn't get too loose"): taps 1 and 2 NUDGE the
    // top five to shifted PERSISTING poses; tap 3 RE-CENTERS them to the neat column.
    // Kill: drop the nudge → tap-1 poses unchanged → false; drop the recenter branch →
    // the accumulated spread survives tap 3 → false.
    {
      const hmN = await hashes();
      const tap = async () => {
        const nxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
        await page.mouse.click(nxy.x, nxy.y);
        await page.waitForFunction(() => window.__GAME3D__.deckNudging() === false, null, { timeout: 60000 }).catch(() => {});
        await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
        return (await info('deck')).top;
      };
      const spreadOf = (ps) => { // the column tightness: max pairwise horizontal distance
        let m = 0;
        for (const a of ps) for (const b of ps) m = Math.max(m, Math.hypot(a.x - b.x, a.z - b.z));
        return m;
      };
      const p0 = (await info('deck')).top;
      const p1 = await tap(); // tap 1 — nudged
      const ds1 = p0.map((v, i) => Math.hypot(p1[i].x - v.x, p1[i].y - v.y, p1[i].z - v.z));
      const maxD = Math.max(...ds1);
      const topMoved = ds1[ds1.length - 1] > 0.3; // I-115/M1: the TAPPED card ITSELF must move (the I-112 regression's kill)
      const p2 = await tap(); // tap 2 — nudged again (looseness accumulates)
      const p3 = await tap(); // tap 3 — RE-CENTERED (I-111)
      const s2 = spreadOf(p2), s3 = spreadOf(p3);
      const hmN1 = await hashes();
      const nOk = maxD > 0.5 && maxD < 12 && topMoved && s3 < 2.5 && s3 < s2
        && (await info('deck')).count === DRAW.length && hmN1.m === hmN.m && hmN1.h === hmN.h;
      check('VG8j/deck-tap-nudge', nOk,
        `tap1 max Δ ${maxD.toFixed(1)}u (want 0.5–12) · TOP card moved:${topMoved} (Δ ${ds1[ds1.length - 1]?.toFixed?.(1)}u — the tapped card itself, I-115/M1) · spread after tap2 ${s2.toFixed(1)}u → tap3 ${s3.toFixed(1)}u (want <2.5 & tighter) · deck-derived · state-invariant:${hmN1.m === hmN.m && hmN1.h === hmN.h}`);
    }

    // v2-table-arrangement (T-1, I-89; RE-PINNED at I-130 — the owner's re-row ruling):
    // season TOP-LEFT · GLOBAL row to its right · standings under the season · ROW A =
    // deck, discard … DICE FAR RIGHT · ROW B below = tradespeople + equipment · ROW C
    // below = BBB + networking (the two NEW staged decks) · the MEDAL region holds the
    // freed bottom-right · the windows region is GONE (suppressed — prompts are onion
    // citizens). All four pile stacks stand as 6-card staged exhibits.
    // Kill: a def regression (move/remove/resurrect a region) or a missing pile fails BY NAME.
    {
      const tp = await info('tradespeople-pile');
      const eq = await info('equipment-pile');
      const bb = await info('bbb-pile');
      const nw = await info('networking-pile');
      const lay = await page.evaluate(() => window.__GAME3D__.tableRegionRects());
      let arrOk = false, arrDetail = 'NO-REGION-RECTS-SURFACE';
      if (lay) {
        const r = Object.fromEntries(lay.map((x) => [x.id, x]));
        const season = r['art-banner'], glob = r['global-play'], stand = r['standings'];
        const seasonTL = season && season.x <= 4 && season.y <= 4;
        const globRight = glob && season && glob.x >= season.x + season.w && glob.y <= 4;
        const standUnder = stand && season && stand.x === season.x && stand.y >= season.y + season.h;
        const rowA = r['deck'] && r['discard'] && r['dice']
          && r['discard'].x > r['deck'].x && r['dice'].x > r['discard'].x + r['discard'].w // dice FAR RIGHT
          && Math.abs(r['dice'].y - r['deck'].y) <= 8 && r['discard'].y === r['deck'].y;
        const rowB = r['tradespeople-pile'] && r['equipment-pile']
          && r['tradespeople-pile'].y > r['deck'].y + r['deck'].h
          && r['equipment-pile'].y === r['tradespeople-pile'].y && r['equipment-pile'].x > r['tradespeople-pile'].x;
        const rowC = r['bbb-pile'] && r['networking-pile']
          && r['bbb-pile'].y > r['tradespeople-pile'].y + r['tradespeople-pile'].h
          && r['networking-pile'].y === r['bbb-pile'].y && r['networking-pile'].x > r['bbb-pile'].x;
        const medalBR = r['medal'] && r['medal'].x >= 60 && r['medal'].y >= 50;
        const windowsGone = !r['windows'];
        arrOk = !!(seasonTL && globRight && standUnder && rowA && rowB && rowC && medalBR && windowsGone);
        arrDetail = `season-top-left:${!!seasonTL} · global-right:${!!globRight} · standings-under:${!!standUnder} · rowA(dice-far-right):${!!rowA} · rowB(trades+equip):${!!rowB} · rowC(bbb+networking):${!!rowC} · medal-bottom-right:${!!medalBR} · windows-GONE:${windowsGone}`;
      }
      // A16 (I-137): tp/eq are REAL pools — their wants DERIVE from the projection's
      // counts (count-true); bbb/networking stay 6-card staged exhibits.
      const pc = await page.evaluate(() => window.__GAME3D__.poolCounts());
      const pilesOk = tp && eq && bb && nw && tp.count === pc.tradespeople && eq.count === pc.equipment && tp.count > 0 && bb.count === pc.bbb && nw.count === pc.networking && bb.count > 0; // O-3 (I-139): ALL FOUR derive
      check('VG8j/v2-table-arrangement', arrOk && !!pilesOk,
        `${arrDetail} · piles tp:${tp?.count}≡${pc?.tradespeople} eq:${eq?.count}≡${pc?.equipment} (REAL — I-137) bbb:${bb?.count}≡${pc?.bbb} nw:${nw?.count}≡${pc?.networking} (REAL — I-139/O-3, all four count-true)`);
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

    // draw-drag-follows (R-1a2, I-110 — the owner: "drag it around before a flick"):
    // mid-drag the grabbed top card sits far from the deck (the plane-follow), then the
    // weak release GLIDES it back — every weak invariant holds. Kill: drop the follow →
    // the card never leaves the deck → false.
    {
      const hmF = await hashes();
      const u0 = await page.evaluate(() => window.__GAME3D__.deckTopUuid()); // I-112: the identity baseline
      const fxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
      await page.mouse.move(fxy.x, fxy.y);
      await page.mouse.down();
      await page.mouse.move(fxy.x + 60, fxy.y + 30);
      await page.waitForTimeout(400);
      await page.mouse.move(fxy.x + 120, fxy.y + 55);
      await page.waitForTimeout(400);
      const thF = await page.evaluate(() => window.__GAME3D__.drawTheater());
      const wander = thF && thF.card && thF.deck ? Math.hypot(thF.card.x - thF.deck.x, thF.card.z - thF.deck.z) : 0;
      const ug = await page.evaluate(() => window.__GAME3D__.drawGrabUuid()); // I-112: mid-drag identity
      await page.mouse.move(fxy.x + 124, fxy.y + 57);
      await page.mouse.up(); // slow → weak → the settle GLIDES back to the deck
      await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
      const gF = await page.evaluate(() => window.__GAME3D__.drawGesture());
      const dF = await info('deck');
      const u1 = await page.evaluate(() => window.__GAME3D__.deckTopUuid()); // I-112: home again — the SAME card
      const hmF1 = await hashes();
      // I-112 (the P-2c uuid precedent): the grabbed mesh IS the former top card, and after
      // the weak release the deck's top is the SAME OBJECT again — a faked traveler cannot pass.
      const identity = !!u0 && ug === u0 && u1 === u0;
      check('VG8j/draw-drag-follows', wander > 30 && identity && gF?.verdict === 'weak' && dF.count === 36 && hmF1.m === hmF.m && hmF1.h === hmF.h,
        `mid-drag wander ${wander.toFixed(0)}u (want >30 — the card FOLLOWS) · IDENTITY:${identity} (grabbed ≡ former top ≡ re-attached top — the three-objects law) · verdict:${gF?.verdict} · deck-derived · state-invariant:${hmF1.m === hmF.m && hmF1.h === hmF.h}`);
    }

    // THE DRAW — Q-2b (I-91): a REAL GRAB + FLICK on the deck's top card (down → fast
    // moves → up; velocity far above the threshold); the gate then WAITS ON STATE.
    const dxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    // I-115/M2: this drive flicks LEFT — the counter-clockwise half of the I-113 ruling,
    // previously uncovered (the drill later flicks RIGHT, so both directions assert).
    for (let i = 1; i <= 4; i++) await page.mouse.move(dxy.x - i * 12, dxy.y - i * 10);
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
    // REWORKED at R-1a2 (I-110, a recorded supersession): the owner ruled the top card
    // DRAGGABLE before the flick, so the flip happens WHERE RELEASED — the law is now
    // AT-TABLE-LEVEL, NEVER A CAMERA FLIGHT: lift < 60u over the deck top, and within
    // 150u horizontal for THIS drive. The restored flight-to-camera mutant (y rockets by
    // hundreds) still dies by name.
    const th = await page.evaluate(() => window.__GAME3D__.drawTheater());
    const fd = await page.evaluate(() => window.__GAME3D__.drawFlipDir()); // I-113/I-115: this drive drags LEFT → −1 (flipDir inits 0 — the unsigned mutant reads 0 and dies)
    let flipAtPile = false, flipDetail = 'NO-THEATER (missed the flip window)';
    if (th && th.card && th.deck) {
      const lift = th.card.y - th.deck.y;
      const horiz = Math.hypot(th.card.x - th.deck.x, th.card.z - th.deck.z);
      flipAtPile = lift < 60 && horiz < 150 && fd === -1;
      flipDetail = `phase ${th.phase} · lift ${lift.toFixed(1)} (<60 — table level, no camera flight) · horiz ${horiz.toFixed(1)} (<150) · flipDir ${fd} (want −1 — flicked LEFT flips counter-clockwise, I-113/I-115)`;
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
      // I-115/M3 (the leg I-113 recorded but never wrote — now real): at 'reading' the
      // traveler's FACE (the underside slot) points UP. MUT: restore the I-112 unflipped
      // end pose → the back shows → drawFaceUp ≈ −1 → false.
      const fUp = await page.evaluate(() => window.__GAME3D__.drawFaceUp());
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

      // draw-theater-hk11 — G-1 (I-101, closing K7-Q B3): the consumed-close window is
      // captured HERE, immediately after the route completes, so it spans ONLY the close.
      // (It used to be read after the Q-6b block, whose real draw contaminated it.)
      const closed = await page.evaluate(() => ({ o: window.__GAME3D__.onionState().open, p: window.__GAME3D__.drawPhase(), z: window.__GAME3D__.zoomState() }));
      const hmClose = await hashes();
      const dClose = await info('deck');
      const consumed = hmClose.m === hm1.m && hmClose.h === hm1.h && dClose.count === d1.count && dClose.fidget === d1.fidget;
      check('VG8j/draw-theater-hk11',
        o1.open === true && o1.title === DRAW[0] && o1.verdict && o1.verdict.mismatch === false
        && fUp !== null && fUp > 0.9
        && d1.count === d0.count - 1 && c1.count === 1 && c1.topFace === DRAW[0]
        && hm1.m === hm0.m + 1 && hm1.h !== hm0.h
        && closed.o === false && closed.p === 'idle' && consumed,
        `onion:${o1.open}/${o1.title} mismatch:${o1.verdict?.mismatch} · faceUpAtEnd:${fUp?.toFixed?.(2)} (want >0.9 — I-115/M3) · deck ${d0.count}→${d1.count} · discard ${c0.count}→${c1.count} top:${c1.topFace} · moves ${hm0.m}→${hm1.m} · hash-changed:${hm1.h !== hm0.h} · closed:${closed.o === false} · close-consumed:${consumed}`);

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
      const sumOk = !!pv && pv.global.length + pv.session.length + pv.pile.length === pv.total && pv.total === 1 && pv.global.length === 0 && pv.session.length === 0 && pv.pile[0] === DRAW[0]; // I-151: genesis seeds NOTHING (O-4's demo pair retired, owner-ruled); only the first draw is in play — it joins the pile
      // G-1 (I-101, closing K7-Q M1): the derived sum is true by construction — the LAW
      // needs the RENDER side. Exactly-once, per family: live meshes ≡ the derived view
      // (a deleted render block or a double-render fails BY NAME at the exercised states).
      const rp = await page.evaluate(() => window.__GAME3D__.renderedPartition());
      const renderOk = !!rp && rp.pile === pv.pile.length && rp.global === pv.global.length && rp.session === pv.session.length;
      check('VG8j/slot-partition-law', famOk && sumOk && renderOk,
        `family{gbl-boom:${fam.g} svc-marketing:${fam.s} job-posting:${fam.d} town-levy:${fam.levy}} · partition sums:${sumOk} (${pv?.pile?.length}+${pv?.global?.length}+${pv?.session?.length}=${pv?.total}) · RENDERED≡derived:${renderOk} (pile ${rp?.pile}/${pv?.pile?.length} · global ${rp?.global}/${pv?.global?.length} · session ${rp?.session}/${pv?.session?.length})`);

      // ── Q-6 (I-94): THE LIVE DISCARD (the pile now holds job-posting, face up) ──
      // discard-toss-return: a REAL slow 130-px drag pulls the top card OFF the pile
      // (scene-attached — the same object), release → LOOSE (the couple-seconds hold,
      // waited as STATE) → glides back to its EXACT slot in pile order; state invariant.
      {
        const hmT = await hashes();
        const d0q = await info('discard');
        const top0 = d0q.top[d0q.top.length - 1];
        const txy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        // G-1 (I-101, closing K7-Q M10): the slow drag must be ARITHMETICALLY below the
        // flick threshold — 143 px over ≥810 ms ≈ 0.18 px/ms vs T 0.35 (>48% margin),
        // never a bet on main-thread latency. Waits SHAPE the input (I-91's timing note);
        // every assertion still waits on STATE.
        // R-1b (I-122): the toss now feeds the slide sim — wait on the READY state first
        // (the VG8r opening-wait pattern), so the drive never races RAPIER's init.
        await page.waitForFunction(() => window.__GAME3D__.dicePhysicsReady() === true, null, { timeout: 30000 });
        await page.mouse.move(txy.x, txy.y);
        await page.mouse.down();
        await page.mouse.move(txy.x + 50, txy.y - 25);
        await page.waitForTimeout(400);
        await page.mouse.move(txy.x + 90, txy.y - 45);
        await page.waitForTimeout(400);
        await page.mouse.move(txy.x + 130, txy.y - 60);
        await page.mouse.up();
        let loose = false;
        try { await page.waitForFunction(() => window.__GAME3D__.discardGesture() === 'loose', null, { timeout: 8000 }); loose = true; } catch { /* named below */ }
        await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 120000 }).catch(() => {});
        const d1q = await info('discard');
        const top1 = d1q.top[d1q.top.length - 1];
        const back = !!(top0 && top1) && Math.hypot(top1.x - top0.x, top1.y - top0.y, top1.z - top0.z) < 3;
        const hmT1 = await hashes();
        // G-1 (I-101, closing K7-Q M8): the return is a GLIDE — the component counted the
        // frames the card actually moved; a snap-home mutant records ≤1 and fails by name.
        const rt = await page.evaluate(() => window.__GAME3D__.discardReturnTrace());
        const glided = !!rt && rt.frames >= 2;
        check('VG8j/discard-toss-return', loose && back && glided && d1q.count === d0q.count && hmT1.m === hmT.m && hmT1.h === hmT.h,
          `loose-observed:${loose} · back-at-slot:${back} (Δ ${top0 && top1 ? Math.hypot(top1.x - top0.x, top1.y - top0.y, top1.z - top0.z).toFixed(2) : '?'}) · glided:${glided} (${rt?.frames} frames over ${rt?.dist?.toFixed?.(0)}u) · count ${d0q.count}→${d1q.count} · state-invariant:${hmT1.m === hmT.m && hmT1.h === hmT.h}`);

        // R-1b (I-122) discard-toss-slides: the SAME toss drive above must have run a
        // REAL slide sim before the card lay loose — the oracle records the burst sim's
        // steps + planar travel. KILL: remove the beginSlide/simulateSlide call (or feed
        // it zero velocity) → the trace stays null / dist ≈ 0 → THIS fails by name.
        // (Physics is warmed by VG8r's opening wait pattern: the readiness gate below
        // never bets on a clock — it waits on the ready STATE first.)
        const physReady = await page.evaluate(() => window.__GAME3D__.dicePhysicsReady());
        const st = await page.evaluate(() => window.__GAME3D__.discardSlideTrace());
        check('VG8j/discard-toss-slides', physReady && !!st && st.steps >= 2 && st.dist > 2,
          `physics-ready:${physReady} · trace:${st ? `steps ${st.steps} · slid ${st.dist.toFixed(1)}u` : 'NULL (the toss never touched physics)'} — the toss carries real momentum (I-122)`);
      }

      // R-1b2 (I-125, closing K7-T B-1 by the owner's ruling "time-gate the discard card
      // so it drops the card dead"): a fast drag → FULL STOP (600 ms ≫ the 150 ms
      // staleness gate) → release must launch NO slide — the trace stays byte-identical
      // to the previous check's, the card just lies loose and returns. KILL: remove the
      // STALE_MS gate → the stale window's velocity launches a slide → the trace is
      // rewritten → THIS fails by name. (The DIE's stale-window quick roll is the
      // owner-ACCEPTED analog, I-120/I-125 — this gate belongs to the discard alone.)
      {
        const stBefore = await page.evaluate(() => JSON.stringify(window.__GAME3D__.discardSlideTrace()));
        const hmS = await hashes();
        const sxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.move(sxy.x, sxy.y);
        await page.mouse.down();
        await page.mouse.move(sxy.x + 60, sxy.y - 30);
        await page.waitForTimeout(250);
        await page.mouse.move(sxy.x + 120, sxy.y - 55);
        await page.waitForTimeout(600); // THE STOP — 4× the staleness gate, never a tight race
        await page.mouse.up();
        let stopLoose = false;
        try {
          await page.waitForFunction(() => { const g = window.__GAME3D__.discardGesture(); return g === 'loose' || g === 'returning'; }, null, { timeout: 8000 });
          stopLoose = true;
        } catch { /* named below */ }
        const stAfter = await page.evaluate(() => JSON.stringify(window.__GAME3D__.discardSlideTrace()));
        await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 120000 }).catch(() => {});
        const hmS1 = await hashes();
        check('VG8j/discard-stop-release-drops-dead', stopLoose && stAfter === stBefore && hmS1.m === hmS.m && hmS1.h === hmS.h,
          `loose-not-sliding:${stopLoose} · trace-unchanged:${stAfter === stBefore} (a stopped hand launched ${stAfter === stBefore ? 'nothing' : 'A SLIDE — the time-gate is dead'}) · state-invariant:${hmS1.m === hmS.m && hmS1.h === hmS.h}`);
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
        check('VG8j/discard-flick-reads', opened && oTitle === DRAW[0] && !!fr && fr.cardId === DRAW[0],
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
        // G-1 (I-101, closing K7-Q M6): the flag alone was hollow — an identity tween
        // (to = from) held it for ~13 frames with ZERO motion. The component now counts
        // frames where poses actually changed and the largest per-frame move; both must
        // be real. Kill: identity tween → maxMove 0 → false; instant-apply → frames 0.
        const tt = await page.evaluate(() => window.__GAME3D__.discardTweenTrace());
        const trulyMoved = !!tt && tt.frames >= 2 && tt.maxMove > 0.05;
        check('VG8j/discard-fidget-animates', transitioning && trulyMoved && f1.fidget === 1 && f1.count === 1,
          `transition-observed:${transitioning} · MOVED:${trulyMoved} (${tt?.frames} frames, max step ${tt?.maxMove?.toFixed?.(2)}u) · fidget-state:${f1?.fidget} · count:${f1?.count}`);
      }

      // FORCED MISMATCH (the VG7d committed-drill precedent) — G-1 (I-101, closing K7-Q
      // B2): the drill is driven by the SAME REAL DRAG as every draw (a plain click
      // stopped drawing at Q-2b — the dead drive was the K7-Q headline finding), and it
      // is REPOSITIONED: post-Q-6b the drill IS the second draw (seeded `new-van`, its
      // written expectation) and it fills the pile to 2 — exactly the state
      // discard-multi-card needs, whose own draw is RETIRED (a third draw would pull
      // `crossroads`: a gated window with no UI until A8, refusing end-turn). HK-11: the
      // flip announces the WRONG card, the verdict flags it, TRUTH WINS on the route.
      {
        await page.evaluate(() => window.__GAME3D__.forceFlipMismatch(true));
        const dxy2 = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
        await page.mouse.move(dxy2.x, dxy2.y);
        await page.mouse.down();
        for (let i = 1; i <= 4; i++) await page.mouse.move(dxy2.x + i * 12, dxy2.y - i * 10);
        await page.mouse.up();
        let f2 = true;
        try { await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'reading', null, { timeout: 60000 }); }
        catch { f2 = false; }
        const o2 = f2 ? await page.evaluate(() => window.__GAME3D__.onionState()) : null;
        const fd2 = f2 ? await page.evaluate(() => window.__GAME3D__.drawFlipDir()) : null; // I-115/M2: the drill drives RIGHT → +1
        await page.mouse.click(stg3.x + stg3.width / 2, stg3.y + stg3.height / 2);
        await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
        const c2 = await info('discard');
        const ownDiscardTrue = c2.count === 2 && c2.topFace === DRAW[1]; // K7-A2 D3: the VIEWER'S ownDiscard, both cards (P-3: the pin derives)
        check('VG8j/forced-mismatch-truth-wins',
          f2 && o2 && o2.verdict && o2.verdict.mismatch === true && o2.verdict.displayed === 'WRONG-CARD'
          && o2.verdict.seeded === DRAW[1] && o2.title === DRAW[1] && ownDiscardTrue && fd2 === 1,
          f2 ? `flagged:${o2.verdict?.mismatch} displayed:${o2.verdict?.displayed} seeded:${o2.verdict?.seeded} · shown:${o2.title} (truth wins) · own-discard:${c2.count}/${c2.topFace} · flipDir:${fd2} (want +1 — flicked RIGHT, I-115/M2)` : 'second flight never landed (timeout)');
      }

      // A8 (I-129, generalized at I-131) · window-prompt-decides: under the P-3 shuffle
      // the FIRST window-opener sits wherever the seeded order put it (for this seed,
      // DRAW[1] opens one at the drill's second draw). The leg is ORDER-AGNOSTIC: if a
      // window is already open, decide it; else draw (real drag + close) until one
      // opens (≤34). The prompt renders on the ONION LAYER (mine, options ≡
      // projection), option 0 submits the REAL decide verb, the prompt leaves, and the
      // end-turn below proves the HK-5 unblock. KILL: unregister the component → no
      // prompt → fails; cut the decide wiring → the window stays open → THIS times out
      // AND the end-turn refuses (two failures name the defect). Runs BEFORE multi-card
      // so no prompt overlays that leg's drags (drill determinism, I-131).
      {
        const hmW = await hashes();
        let pW = await page.evaluate(() => window.__GAME3D__.windowPrompts());
        while (pW.want.length === 0 && extraDrawsA8 < 34) {
          const dxyW = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
          await page.mouse.move(dxyW.x, dxyW.y);
          await page.mouse.down();
          for (let i = 1; i <= 4; i++) await page.mouse.move(dxyW.x + i * 12, dxyW.y - i * 10);
          await page.mouse.up();
          await page.waitForFunction(() => window.__GAME3D__.onionState().open === true, null, { timeout: 60000 });
          const cxyW = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
          await page.mouse.click(cxyW.x, cxyW.y); // consumed close → the route runs
          await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
          extraDrawsA8++;
          pW = await page.evaluate(() => window.__GAME3D__.windowPrompts());
        }
        let promptUp = false;
        try {
          await page.waitForFunction(() => { const q = window.__GAME3D__.windowPrompts(); return q.want.length >= 1 && q.match && q.rendered[0].mine === true; }, null, { timeout: 8000 });
          promptUp = true;
        } catch { /* named below */ }
        const pUp = await page.evaluate(() => window.__GAME3D__.windowPrompts());
        let decided = false;
        if (promptUp && pUp.rendered[0]) {
          const oxy = await page.evaluate((a) => window.__GAME3D__.windowOptionXY(a, 0), pUp.rendered[0].id);
          if (oxy) {
            await page.mouse.click(oxy.x, oxy.y);
            try { await page.waitForFunction(() => window.__GAME3D__.windowPrompts().want.length === 0, null, { timeout: 8000 }); decided = true; } catch { /* named below */ }
          }
        }
        const pGone = await page.evaluate(() => window.__GAME3D__.windowPrompts());
        const hmW1 = await hashes();
        check('VG8j/window-prompt-decides',
          promptUp && decided && pGone.rendered.length === 0
          && hmW1.m === hmW.m + extraDrawsA8 + 1 && hmW1.h !== hmW.h, // draws + the decide — all REAL moves
          `prompt-up+mine+match:${promptUp} (${pUp.rendered[0] ? `${pUp.rendered[0].kind}/${pUp.rendered[0].decider}/${pUp.rendered[0].options.length} opts` : 'NONE'} · after ${extraDrawsA8} extra draws) · decided:${decided} · prompt-gone:${pGone.rendered.length === 0} · moves ${hmW.m}→${hmW1.m} (want +${extraDrawsA8 + 1}) — the HK-5 soft-lock closes on the ONION layer (I-129/I-131)`);
      }

      // discard-multi-card (Q-6b, I-95 — THE OWNER'S EXACT SCENARIO: "drag some cards out
      // of the way and then flick a card I couldn't reach before, it should pop open"):
      // the DRILL above filled the pile to 2 (new-van on top — G-1/I-101, no draw of its
      // own); drag the TOP card away slowly → LOOSE; WHILE it is loose, grab + FLICK the
      // card underneath → the reading board OPENS on it, one card still out. Kill:
      // restore the single-gesture lock → the under-card flick is refused → no onion.
      {
        const stg2 = await page.locator('#stage canvas').boundingBox();
        const dM = await info('discard');
        // drag the TOP card (new-van) out of the way — slow → LOOSE. G-1 (I-101, M10):
        // 165 px over ≥810 ms ≈ 0.20 px/ms vs T 0.35 — arithmetically sub-threshold.
        const mxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.move(mxy.x, mxy.y);
        await page.mouse.down();
        await page.mouse.move(mxy.x + 60, mxy.y + 30);
        await page.waitForTimeout(400);
        await page.mouse.move(mxy.x + 105, mxy.y + 50);
        await page.waitForTimeout(400);
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
        check('VG8j/discard-multi-card', loose2 && popped && oT2 === DRAW[0] && poolAt >= 2 && dM.count === 2 && dEnd.count === 2,
          `top-card-loose:${loose2} · under-card flick POPPED:${popped}/${oT2} (want job-posting) · cards-out-at-once:${poolAt} · pile ${dM?.count}→${dEnd?.count} (want 2→2)`);
      }
      // (G-1/I-101: the closed/hmClose/dClose capture and the draw-theater-hk11 check
      // moved UP — emitted right after the route, before the discard family. B3 closed.)

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
      const fillsOk = !!(oa && JSON.stringify(oa.regions.title?.lines) === JSON.stringify([DRAW[0]])
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

      // (G-1/I-101: the FORCED-MISMATCH drill moved UP — it now IS the second draw,
      // driven by the real drag, feeding discard-multi-card. B2 closed.)

      // FIDGET = PURE THEATER (I-67e): three discard clicks cycle loose → spread → NEAT
      // EXACT; rowHash AND moveCount are invariant through every fidget click.
      // G-1 (I-101, the Q3-D2 red + the I-80 float-flake fold): the counter is NORMALIZED
      // to 0 first (discard-fidget-animates left it at 1 — the never-reset counter made
      // the cycle land 2→0→1 against a stale pose baseline), the pose baseline is captured
      // AFTER normalization, each click WAITS OUT its tween (post-Q-6 the fidget ANIMATES;
      // a click during a live tween is refused while the counter still advances — M5,
      // carried), and the pose tolerance is 1e-6 (the recorded 1e-9 flake, I-80).
      for (let i = 0; i < 3; i++) {
        const fNow = (await info('discard')).fidget;
        if (fNow === 0) break;
        const nxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.click(nxy.x, nxy.y);
        await page.waitForFunction(() => window.__GAME3D__.discardTransitioning() === false, null, { timeout: 60000 }).catch(() => {});
      }
      const hm2 = await hashes();
      const p0 = (await info('discard')).top;
      const states = [];
      for (let i = 0; i < 3; i++) {
        const rxy2 = await page.evaluate(() => window.__GAME3D__.regionScreenXY('discard'));
        await page.mouse.click(rxy2.x, rxy2.y);
        await page.waitForFunction(() => window.__GAME3D__.discardTransitioning() === false, null, { timeout: 60000 }).catch(() => {});
        states.push(await info('discard'));
      }
      const hm3 = await hashes();
      const posEq = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v.x - b[i].x) < 1e-6 && Math.abs(v.y - b[i].y) < 1e-6 && Math.abs(v.z - b[i].z) < 1e-6);
      const moved1 = !posEq(states[0].top, p0);
      const moved2 = !posEq(states[1].top, states[0].top);
      const restored = posEq(states[2].top, p0) && states[2].fidget === 0;
      const pure = hm3.h === hm2.h && hm3.m === hm2.m;
      check('VG8j/fidget-pure-theater', moved1 && moved2 && restored && pure,
        `normalized-then: peek-moved:${moved1} · spread-moved:${moved2} · neat-restored-exact:${restored} · rowHash+moves-invariant:${pure}`);

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
      // K7-U B-1's closure: BOTH deck-count asserts below derive from ONE source — the
      // implementation's own order length (a stale hand-pin here made this check
      // structurally unsatisfiable: :591 wanted 36 while :603 still wanted the
      // pre-shuffle 2 over the same untouched deck).
      const PETE_DECK = (await page.evaluate(() => window.__GAME3D__.deckOrder('pete'))).length;
      const deckIsPetes = d2.count === PETE_DECK; // P-3 (I-131): EVERY seat's deck is the full set
      const c3 = await info('discard');
      // K7-A2 D3: ownDiscard is the VIEWER'S — invariant across the turn change. P-3
      // (I-131): the values DERIVE — the drill drew 2 + whatever the decide leg needed;
      // the top is the LAST drawn card in the seeded order. The LAW is unchanged.
      const ownDiscardHeld = c3.count === 2 + extraDrawsA8 && c3.topFace === DRAW[1 + extraDrawsA8];
      // deck fidget when NOT the viewer's turn (I-67d): a deck click must NOT draw
      const hm4 = await hashes();
      const dxy3 = await page.evaluate(() => window.__GAME3D__.regionScreenXY('deck'));
      await page.mouse.click(dxy3.x, dxy3.y);
      const dFid = await info('deck');
      const hm5 = await hashes();
      const fidgetNotDraw = dFid.fidget === 1 && hm5.h === hm4.h && hm5.m === hm4.m && dFid.count === PETE_DECK; // K7-U B-1: derived, same source as :591
      check('VG8j/state-change-recheck', standingsOk && hdrOk && logOk && deckIsPetes && ownDiscardHeld && fidgetNotDraw,
        `active:${after.v.active} · standings-rederived:${standingsOk} · hdr:${hdrOk} · log(end-turn+draw):${logOk} · deck-now-petes(${PETE_DECK}):${deckIsPetes} · own-discard-held:${ownDiscardHeld} · deck-fidget-not-draw:${fidgetNotDraw}`);
    }
    await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  }
}
