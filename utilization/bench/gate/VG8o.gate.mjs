// VG8o — A15, K-D: THE GAME BOX (I-80; SUPERSEDES the batch-1 VG8o of I-75; kill-first). An
// OPEN box (a base + four walls, NO top) with a SEPARATE bottomless LIPPED lid set OFF the
// base, to the RIGHT of the whole TABLE, as if unpacked — STATIC. Selectable via the ladder
// (a click ANCHORS it), NOT fidgetable. These are the OWNER-BEHAVIOR checks that would have
// CAUGHT the batch-1 failure (mis-placed near the table centre / too small / a tray-lid):
//   (right-of-table)   the box's LEFT edge world-x > the TABLE's RIGHT edge world-x — EDGES
//                      from the real table bbox (the batch-1 miss was a centre-vs-centre compare).
//   (large-enough)     the box footprint area ≥ ¼ the table footprint area (both real bboxes).
//   (open-no-top)      the base is an open box — ≥4 walls, exactly ONE horizontal panel (the
//                      bottom), NO top face.
//   (lid-…-lipped)     the lid is a DISTINCT object OFF the base, a four-edge rim (≥4 rim
//                      walls) with NO bottom/top face (0 horizontal panels) — bottomless.
//   (selectable)       a REAL click ANCHORS 'box' and moves NO state (not fidgetable).
// Asserted as scene STATE — object presence + world geometry + the anchor — never pixels
// (I-57c). SELF-SEEDING: navigates a fresh game3d.html (the box is static scene geometry).
export const suite = '3d';
export const id = 'VG8o';

export async function run(h) {
  const { page, check, gotoStage, screenshot } = h;
  const G = (fn, ...a) => page.evaluate(fn, ...a);

  await gotoStage('game3d.html');
  await G(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});

  const bp = await G(() => window.__GAME3D__.boxProbe());

  // box-present: a box object exists in the scene (its base among its parts)
  check('VG8o/box-present', !!(bp && bp.present && bp.hasBase),
    bp && bp.present ? `box present · base:${bp.hasBase}` : 'NO BOX in the scene');

  // PA-2 (I-142, superseding box-right-of-table): the box is a RING OCCUPANT — slot 6,
  // its centre ON the template's circle (the same derivation the seats consume).
  // KILL: restore the beside-the-table placement → centre ≉ slot → fails by name.
  // F-5 (I-148): the box is a WIDE occupant — its slot pushes OUT by its footprint
  // claim (320). The want derives from the same direction at R+320.
  const slot6 = await G((n) => window.__GAME3D__.ringSlot(n), 6);
  const ring6 = await G(() => window.__GAME3D__.ringInfo());
  const k6 = (ring6.r + 320) / ring6.r;
  const boxOnRing = !!(bp && bp.present && bp.boxCenter && slot6
    && Math.hypot(bp.boxCenter.x - slot6.x * k6, bp.boxCenter.z - slot6.z * k6) < 2);
  check('VG8o/box-on-ring', boxOnRing,
    bp && bp.boxCenter && slot6
      ? `box centre (${bp.boxCenter.x.toFixed(0)},${bp.boxCenter.z.toFixed(0)}) ≡ slot 6 @ R+320 (${(slot6.x * k6).toFixed(0)},${(slot6.z * k6).toFixed(0)}) — footprint-aware (I-148)`
      : 'no box centre / no ring slot');

  // box-large-enough: the box footprint ≥ ¼ the table footprint (the table folds in four)
  check('VG8o/box-large-enough', !!(bp && bp.present && bp.boxArea !== null && bp.tableArea !== null && bp.boxArea >= bp.tableArea / 4),
    bp && bp.present && bp.boxArea !== null && bp.tableArea !== null
      ? `box footprint ${Math.round(bp.boxArea)} ≥ ¼ table ${Math.round(bp.tableArea / 4)} (table ${Math.round(bp.tableArea)}; ratio ${(bp.boxArea / bp.tableArea).toFixed(3)})`
      : 'no footprint areas');

  // box-open-no-top: the base is an OPEN box — ≥4 walls, exactly ONE horizontal panel (bottom), no top
  check('VG8o/box-open-no-top', !!(bp && bp.present && bp.hasBase && bp.baseWalls >= 4 && bp.baseHPanels === 1),
    bp && bp.present ? `base walls:${bp.baseWalls} (≥4) · horizontal-panels:${bp.baseHPanels} (want 1 = bottom, no top)` : 'no box');

  // box-lid-shallow-bottomless-lipped: the lid is a DISTINCT object OFF the base, a four-edge
  // rim (≥4 rim walls) with NO bottom/top face (0 horizontal panels)
  check('VG8o/box-lid-shallow-bottomless-lipped',
    !!(bp && bp.present && bp.hasLid && bp.distinct && bp.offBase && bp.lidRimWalls >= 4 && bp.lidHPanels === 0),
    bp && bp.present
      ? `lid distinct:${bp.distinct} off-base:${bp.offBase} · rim-walls:${bp.lidRimWalls} (≥4) · bottom/top-faces:${bp.lidHPanels} (want 0) (lid ${bp.lidCenter ? `${bp.lidCenter.x.toFixed(0)},${bp.lidCenter.z.toFixed(0)}` : '—'} vs base ${bp.baseCenter ? `${bp.baseCenter.x.toFixed(0)},${bp.baseCenter.z.toFixed(0)}` : '—'})`
      : 'no box');

  // box-selectable: a REAL click on the box ANCHORS it (lastFocus='box') and moves NO state —
  // seat + table + box are selectable-not-fidgetable (I-75/I-80). Kill-first: a box click that
  // fidgets or fails to anchor fails this by name.
  const bxy = await G(() => window.__GAME3D__.boxScreenXY());
  let selectable = false, selDetail = 'NO-BOX-XY';
  if (bxy) {
    const hm0 = await G(() => ({ h: window.__GAME3D__.rowHash(), m: window.__GAME3D__.moveCount() }));
    await page.mouse.click(bxy.x, bxy.y);
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const anchor = await G(() => window.__GAME3D__.zoomState().lastFocus);
    const hm1 = await G(() => ({ h: window.__GAME3D__.rowHash(), m: window.__GAME3D__.moveCount() }));
    selectable = anchor === 'box' && hm1.h === hm0.h && hm1.m === hm0.m;
    selDetail = `anchor→${anchor} (want box) · rowHash-invariant:${hm1.h === hm0.h} · moves-invariant:${hm1.m === hm0.m}`;
  }
  check('VG8o/box-selectable', selectable, selDetail);

  await G(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  await screenshot('/tmp/vg-3d-stage.png');
}
