// VG8q — S-1 (I-103; kill-first): CONTRACT v3 — THE SPINE CLOSURES. The four K7-Q
// preconditions for R-1, each with its named mutant: the claim releases in a FINALLY
// (a throwing release can never freeze input — M3) · claims are PER-POINTER with
// capture + cancel (the spine no longer carries the single-gesture lock I-95 fixed one
// layer down; touch is an owner requirement) · the WHEEL is gated on a live claim
// (I-91's "camera suppressed until release" made true — D9) · a REBUILD aborts every
// live claim through onGrabAbort (rebuild safety as protocol obligation — M4).
// STATE/geometry, never pixels (I-57c); waits on STATE, never clocks (I-60f).
// SELF-SEEDING (fresh genesis: moe active, deck 36).
export const suite = '3d';
export const id = 'VG8q';

export async function run(h) {
  const { page, check, gotoStage, hashes, info } = h;
  const G = (fn, ...a) => page.evaluate(fn, ...a);

  await gotoStage('game3d.html');
  await G(() => window.__GAME3D__.glideTo('table'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});

  // 1 · wheel-suppressed-during-grab: grab the deck top and HOLD; wheel in and out;
  // the zoom ladder must not move (camera state invariant, no glide started).
  // Kill: remove the camera wheelGate → the dolly/ladder fires → zoomState changes.
  {
    const dxy = await G(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    await page.mouse.move(dxy.x + 8, dxy.y - 6); // the claim is live, the card lifted
    const claimed = await G(() => window.__GAME3D__.grabClaims());
    const z0 = await G(() => JSON.stringify({ z: window.__GAME3D__.zoomState(), c: window.__GAME3D__.camName() }));
    await page.mouse.wheel(0, -240);
    await page.mouse.wheel(0, 240);
    const z1 = await G(() => JSON.stringify({ z: window.__GAME3D__.zoomState(), c: window.__GAME3D__.camName() }));
    const gl = await G(() => window.__GAME3D__.gliding());
    await page.mouse.up(); // a weak release — the card settles back, no draw
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    check('VG8q/wheel-suppressed-during-grab', claimed === 1 && z0 === z1 && !gl,
      `claims:${claimed} (want 1) · camera-invariant:${z0 === z1} · no-glide:${!gl} — the wheel is dead while a grab is live`);
  }

  // 2 · grab-release-on-throw: arm the drill (the spine THROWS in place of onGrabEnd —
  // the forceFlipMismatch precedent), drive a real drag; the claim must release, the
  // abort settles the card, and the NEXT gesture — a full flick draw — works end-to-end
  // (input alive, camera alive). Kill: remove the finally/catch → the claim sticks, the
  // pointerId can never re-claim, the follow-up draw never happens.
  {
    const hm0 = await hashes();
    await G(() => window.__GAME3D__.forceGrabEndThrow());
    const dxy = await G(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(dxy.x + i * 12, dxy.y - i * 10);
    await page.mouse.up(); // ← the release THROWS (uncaught, by design); finally must run
    const claimsAfter = await G(() => window.__GAME3D__.grabClaims());
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    const orphan = await G(() => window.__GAME3D__.orphanGrabMeshes());
    const hm1 = await hashes();
    const invariant = hm1.m === hm0.m && hm1.h === hm0.h; // the thrown release drew NOTHING
    // the aliveness proof: a REAL flick draw straight through (flip → reading → close → route)
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(dxy.x + i * 12, dxy.y - i * 10);
    await page.mouse.up();
    let drew = true;
    try { await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'reading', null, { timeout: 60000 }); }
    catch { drew = false; }
    const stg = await page.locator('#stage canvas').boundingBox();
    await page.mouse.click(stg.x + 20, stg.y + 20);
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    const hm2 = await hashes();
    const d2 = await info('deck');
    check('VG8q/grab-release-on-throw',
      claimsAfter === 0 && orphan.count === 0 && orphan.phase === 'idle' && invariant
      && drew && hm2.m === hm1.m + 1 && d2.count === 35,
      `claims-after-throw:${claimsAfter} (want 0) · orphan-mesh:${orphan.count}@${orphan.phase} · throw-drew-nothing:${invariant} · NEXT-draw-works:${drew} (moves ${hm1.m}→${hm2.m}, deck ${d2?.count}) — one throw can never freeze the bench`);
  }

  // 6 · grab-move-throw-aborts (S-1c, I-107 — K7-S MAJOR-1's kill): the spine THROWS in
  // place of onGrabMove; the claim must release AND the component must be ABORTED (the
  // card settles home, the surface stays grabbable). Kill: restore the release-without-
  // abort catch → phase sticks at 'grabbing', grabStart refuses forever, the follow-up
  // weak gesture never records a verdict.
  {
    await G(() => window.__GAME3D__.forceGrabMoveThrow());
    const dxy = await G(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    await page.mouse.move(dxy.x + 30, dxy.y - 20); // ← the move THROWS (uncaught, by design)
    const claimsAfter = await G(() => window.__GAME3D__.grabClaims());
    await page.mouse.up();
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    const orphan = await G(() => window.__GAME3D__.orphanGrabMeshes());
    // the aliveness proof: a fresh WEAK gesture completes and records its verdict
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    await page.mouse.move(dxy.x + 3, dxy.y - 2);
    await page.waitForTimeout(400);
    await page.mouse.move(dxy.x + 6, dxy.y - 4);
    await page.mouse.up();
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    const g6 = await G(() => window.__GAME3D__.drawGesture());
    check('VG8q/grab-move-throw-aborts',
      claimsAfter === 0 && orphan.count === 0 && orphan.phase === 'idle' && !!g6 && g6.verdict === 'weak',
      `claims-after-move-throw:${claimsAfter} (want 0) · orphan:${orphan.count}@${orphan.phase} · next-gesture-verdict:${g6?.verdict} (want weak) — the move path mirrors the release path`);
  }

  // 3 · grab-cancel-releases: a SYNTHETIC pointer (id 77 — touch's stand-in) grabs the
  // pile card, drags it out, then CANCELS (what touch does constantly). The abort must
  // release the claim and glide the card home. Kill: remove the pointercancel listener
  // → the claim sticks at 1 forever.
  {
    const txy = await G(() => window.__GAME3D__.regionScreenXY('discard'));
    await G(({ x, y }) => {
      const el = document.querySelector('#stage canvas');
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 77, clientX: x, clientY: y, bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 77, clientX: x + 90, clientY: y + 40, bubbles: true }));
    }, txy);
    const held = await G(() => ({ claims: window.__GAME3D__.grabClaims(), g: window.__GAME3D__.discardGesture() }));
    await G(() => {
      const el = document.querySelector('#stage canvas');
      el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 77, bubbles: true }));
    });
    const released = await G(() => window.__GAME3D__.grabClaims());
    await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 120000 }).catch(() => {});
    const back = await info('discard');
    check('VG8q/grab-cancel-releases',
      held.claims === 1 && held.g === 'held' && released === 0 && back.count === 1,
      `held:${held.claims}/${held.g} → cancel → claims:${released} (want 0) · card home, pile ${back?.count} — touch cancels are survivable`);
  }

  // 7 · fidget-refused-holds-counter (S-1c, I-107 — K7-S MAJOR-2's kill, the M5 check
  // G-1 owed): drag the pile card out SLOWLY → LOOSE; WHILE it is loose, CLICK the
  // (now-empty) pile — the fidget must REFUSE: counter INVARIANT, no transition, so the
  // pile can never SNAP to an unanimated state on the next rebuild. Kill: make
  // startFidgetTween return true unconditionally (K7-S mutation (c)) → the counter
  // advances on the refused click → false.
  {
    const f0 = (await info('discard')).fidget;
    const txy = await G(() => window.__GAME3D__.regionScreenXY('discard'));
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
    await page.mouse.click(txy.x, txy.y); // the REFUSED fidget click — a card is out
    const f1 = (await info('discard')).fidget;
    const trans = await G(() => window.__GAME3D__.discardTransitioning());
    await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 120000 }).catch(() => {});
    const f2 = (await info('discard')).fidget;
    check('VG8q/fidget-refused-holds-counter',
      loose && f1 === f0 && f2 === f0 && trans === false,
      `card-loose:${loose} · refused-click counter ${f0}→${f1}→${f2} (want invariant) · no-transition:${trans === false} — a refused fidget advances NOTHING (M5's kill, at last)`);
  }

  // 4 · grab-per-pointer: the REAL mouse holds a crew card (seat-play's claim) WHILE a
  // second SYNTHETIC pointer (id 88) grabs the pile card (table's claim) — TWO live
  // claims at once, routed independently. Kill: restore the single `grabber` → the
  // second claim aliases/refuses → never 2.
  {
    await G(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    // I-152: no genesis crew — the free first hire supplies the drill's crew card
    const pcH = await G(() => window.__GAME3D__.poolCounts());
    const hxy = await G(() => window.__GAME3D__.regionScreenXY('tradespeople-pile'));
    if (hxy) {
      await page.mouse.move(hxy.x, hxy.y);
      await page.mouse.down();
      for (let i = 1; i <= 4; i++) await page.mouse.move(hxy.x + i * 12, hxy.y + i * 10);
      await page.mouse.up(); // the FLICK — C-1c (I-156): the verb's only door
      await page.waitForFunction((want) => window.__GAME3D__.poolCounts().tradespeople === want, pcH.tradespeople - 1, { timeout: 8000 }).catch(() => {});
      await page.waitForFunction(() => window.__GAME3D__.supplyPhase() === 'idle', null, { timeout: 60000 }).catch(() => {}); // the anchor-change completes
    }
    const HIRED = await G(() => { const m = window.__GAME3D__.viewCrew().find((c) => c.outfit === 'moe'); return m ? m.id : null; });
    const cxy = await G((id) => window.__GAME3D__.seatPlayCardXY(`crew:${id}`), HIRED);
    await page.mouse.move(cxy.x, cxy.y);
    await page.mouse.down();
    for (let i = 1; i <= 3; i++) await page.mouse.move(cxy.x + i * 20, cxy.y - i * 8);
    const dxy = await G(() => window.__GAME3D__.regionScreenXY('discard'));
    const both = await G(async ({ x, y }) => {
      const el = document.querySelector('#stage canvas');
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 88, clientX: x, clientY: y, bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 88, clientX: x + 30, clientY: y + 14, bubbles: true }));
      const mid = window.__GAME3D__.grabClaims(); // sampled WHILE both pointers hold
      await new Promise((r) => setTimeout(r, 900)); // slow shape → the release is a toss, not a flick
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 88, clientX: x + 55, clientY: y + 26, bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 88, clientX: x + 55, clientY: y + 26, bubbles: true }));
      return mid;
    }, dxy);
    await page.mouse.up(); // the crew card starts its reset glide
    const seatSettled = await page.waitForFunction(() => { const s = window.__GAME3D__.seatPlayGrabState(); return !s.grabbing && !s.resetting; }, null, { timeout: 60000 }).then(() => true).catch(() => false);
    await page.waitForFunction(() => window.__GAME3D__.discardGesture() === null, null, { timeout: 120000 }).catch(() => {});
    const end = await G(() => window.__GAME3D__.grabClaims());
    check('VG8q/grab-per-pointer', both === 2 && end === 0 && seatSettled,
      `simultaneous-claims:${both} (want 2 — crew held + pile held) · all-released:${end === 0} · seat-settled:${seatSettled} — multi-touch never aliases`);
  }

  // 5 · grab-abort-on-rebuild: grab the deck top (the claim live, the card lifted), then
  // fire END TURN from the bar — the rebuild must ABORT the claim through onGrabAbort:
  // no stuck claim, no orphaned grab mesh, the fresh build renders pete's deck, the turn
  // really passed. Kill: drop the buildScene abort loop → the claim survives the rebuild
  // and the grab mesh is orphaned in the scene.
  {
    const dxy = await G(() => window.__GAME3D__.regionScreenXY('deck'));
    await page.mouse.move(dxy.x, dxy.y);
    await page.mouse.down();
    await page.mouse.move(dxy.x + 10, dxy.y - 8); // live grab, wasDrag set (the up stays inert)
    const before = await G(() => window.__GAME3D__.grabClaims());
    await G(() => document.getElementById('end-btn').click()); // endTurn → buildScene MID-GRAB
    const after = await G(() => window.__GAME3D__.grabClaims());
    await page.mouse.up();
    await page.waitForFunction(() => window.__GAME3D__.drawPhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    const orphan = await G(() => window.__GAME3D__.orphanGrabMeshes());
    const v = await G(() => window.__GAME3D__.viewData());
    const d = await info('deck');
    check('VG8q/grab-abort-on-rebuild',
      before === 1 && after === 0 && orphan.count === 0 && orphan.phase === 'idle' && v.active === 'pete' && d.count === 2,
      `claim ${before}→${after} across the rebuild (want 1→0) · orphan-mesh:${orphan.count}@${orphan.phase} · turn passed:${v.active} · deck-now-petes:${d?.count} — rebuild safety is the protocol's, not a habit`);
  }
}
