// VG8p — Q-3 (I-93; kill-first): THE SEAT PLAY AREA. Each seat's CREW as a count-true row
// IN FRONT of its board (from the I-93 public view.crew projection field — R-19 honored);
// the viewer's assets at the row's right end (unattached until the attach verbs land,
// I-82f); GRAB + RESET (contract v2) — a real drag moves a crew card, release glides it
// BACK to its anchor, state invariant; the ledger folder sits at the LEFT EDGE of the
// seat area (derived from the live board bbox — I-84(5a) discharged). STATE/geometry,
// never pixels (I-57c); waits on STATE, never clocks (I-60f). SELF-SEEDING.
export const suite = '3d';
export const id = 'VG8p';

export async function run(h) {
  const { page, check, gotoStage, hashes } = h;
  const G = (fn, ...a) => page.evaluate(fn, ...a);

  await gotoStage('game3d.html');
  await G(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});

  // crew-rows-true: per seat, rendered crew cards ≡ the projection's crew by outfit
  // (genesis: exactly one per shop, six seats) AND the row sits BETWEEN board and table.
  const rows = await G(() => window.__GAME3D__.crewRows());
  const rowsOk = Array.isArray(rows) && rows.length === 6
    && rows.every((r) => r.want === r.got && r.want === 1 && r.inFront);
  check('VG8p/crew-rows-true', rowsOk,
    `${rows?.length} seats · ${rows?.map((r) => `${r.seat}:${r.got}/${r.want}${r.inFront ? '' : '·NOT-IN-FRONT'}`).join(' ')}`);

  // assets-count-true — G-1 (I-101, closing K7-Q M7): the check now PINS the genesis
  // ZERO on both sides (want===0 AND got===0), so a projection drift OR a phantom asset
  // mesh fails by name. It is DEFERRED-AT-ZERO on the record: the render-block falsifier
  // (delete the asset render → caught) needs a seedable non-zero state, carried on I-93
  // (the I-76 re-kill precedent). No silent vacuity — the zero is the assertion.
  const ac = await G(() => window.__GAME3D__.assetsCount());
  check('VG8p/assets-count-true', !!ac && ac.want === 0 && ac.got === 0,
    `genesis zero PINNED: rendered ${ac?.got} ≡ projection ${ac?.want} ≡ 0 · DEFERRED-until-nonzero (I-93 trigger)`);

  // seatplay-grab-reset: a REAL ~100-px drag on moe's crew card moves it off its anchor;
  // release → the reset glide returns it (Δ<5), rowHash/moveCount INVARIANT (pure theater).
  const hm0 = await hashes();
  const xy = await G(() => window.__GAME3D__.seatPlayCardXY('crew:crew-moe'));
  let resetOk = false, resetDetail = 'NO-CARD-XY';
  if (xy) {
    await page.mouse.move(xy.x, xy.y);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) await page.mouse.move(xy.x + i * 24, xy.y - i * 12);
    await page.mouse.up();
    await page.waitForFunction(() => { const s = window.__GAME3D__.seatPlayGrabState(); return !s.grabbing && !s.resetting; }, null, { timeout: 60000 }).catch(() => {});
    const st = await G(() => window.__GAME3D__.seatPlayGrabState());
    const pos = await G(() => window.__GAME3D__.seatPlayCardPos('crew:crew-moe'));
    const hm1 = await hashes();
    const back = pos && Math.hypot(pos.x - pos.ax, pos.y - pos.ay, pos.z - pos.az) < 5;
    const invariant = hm1.m === hm0.m && hm1.h === hm0.h;
    // G-1 (I-101, closing K7-Q M8): the return must be a GLIDE, not a teleport — the
    // component counts frames where the pose actually changed; a snap mutant records ≤1.
    const glided = (st?.lastReset?.frames ?? 0) >= 2;
    resetOk = !!(st?.lastReset && st.lastReset.moved > 40 && st.lastReset.returned && glided && back && invariant);
    resetDetail = `dragged ${st?.lastReset?.moved?.toFixed?.(0)}u · returned:${st?.lastReset?.returned} · glided:${glided} (${st?.lastReset?.frames} frames) · at-anchor:${back} · state-invariant:${invariant}`;
  }
  check('VG8p/seatplay-grab-reset', resetOk, resetDetail);

  // ledger-left-edge (RE-DERIVED at I-132): 'left' in the seat-0 board's OWN FRAME —
  // the folder's lateral coordinate sits past the board's left edge (corner-safe; the
  // world-x form was placement-specific, the LAW is left-of-your-board). Kill: restore
  // an axis-aligned magic point on a corner seat → lateral ≥ −130 → false.
  const leftOk = await G(() => window.__GAME3D__.ledgerLeftOfBoard());
  check('VG8p/ledger-left-edge', !!leftOk && leftOk.left === true,
    `folder lateral ${leftOk?.folderLat?.toFixed?.(0)} < board-left ${leftOk?.boardLeftLat} : ${leftOk?.left} (the seat frame law, I-132)`);
}
