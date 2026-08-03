// VG8o — A15: THE GAME BOX (I-75, owner-ruled 2026-08-02; kill-first). An OPEN box (a base
// + four low walls) with a SEPARATE lid set OFF the base, to the RIGHT of the VIEWING
// seat's board, as if unpacked — STATIC. Selectable via the ladder (a click ANCHORS it),
// NOT fidgetable. Diffused (MeshBasic), unskinned (D-1). Asserted as scene STATE — object
// presence + world geometry + the anchor — never pixels (I-57c). SELF-SEEDING: navigates a
// fresh game3d.html (the box is static scene geometry, state-independent) so it PASSES alone.
export const suite = '3d';
export const id = 'VG8o';

export async function run(h) {
  const { page, check, gotoStage, screenshot } = h;

  await gotoStage('game3d.html');
  {
    await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const bp = await page.evaluate(() => window.__GAME3D__.boxProbe());
    // box-present: a box object exists in the scene (its base among its parts)
    check('VG8o/box-present', !!(bp && bp.present && bp.hasBase),
      bp && bp.present ? `box present · base:${bp.hasBase}` : 'NO BOX in the scene');
    // box-right-of-board: the box's world x is beyond (greater than) the viewing board's x
    check('VG8o/box-right-of-board', !!(bp && bp.present && bp.boardX !== null && bp.boxX > bp.boardX),
      bp && bp.present && bp.boardX !== null ? `box x ${bp.boxX.toFixed(1)} > viewing-board x ${bp.boardX.toFixed(1)}` : 'no box / no board');
    // box-open-form: a LID object distinct from the base, sitting OFF the base (unpacked)
    check('VG8o/box-open-form', !!(bp && bp.present && bp.hasBase && bp.hasLid && bp.distinct && bp.offBase),
      bp && bp.present
        ? `base:${bp.hasBase} lid:${bp.hasLid} distinct:${bp.distinct} off-base:${bp.offBase} (lid ${bp.lidCenter ? `${bp.lidCenter.x.toFixed(0)},${bp.lidCenter.z.toFixed(0)}` : '—'} vs base ${bp.baseCenter ? `${bp.baseCenter.x.toFixed(0)},${bp.baseCenter.z.toFixed(0)}` : '—'})`
        : 'no box');
    // box-selectable: a REAL click on the box ANCHORS it (lastFocus='box') and moves NO
    // state — seat + table + box are selectable-not-fidgetable (I-75). Kill-first: a box
    // click that fidgets or fails to anchor fails this by name.
    const bxy = await page.evaluate(() => window.__GAME3D__.boxScreenXY());
    let selectable = false, selDetail = 'NO-BOX-XY';
    if (bxy) {
      const hm0 = await page.evaluate(() => ({ h: window.__GAME3D__.rowHash(), m: window.__GAME3D__.moveCount() }));
      await page.mouse.click(bxy.x, bxy.y);
      await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
      const anchor = await page.evaluate(() => window.__GAME3D__.zoomState().lastFocus);
      const hm1 = await page.evaluate(() => ({ h: window.__GAME3D__.rowHash(), m: window.__GAME3D__.moveCount() }));
      selectable = anchor === 'box' && hm1.h === hm0.h && hm1.m === hm0.m;
      selDetail = `anchor→${anchor} (want box) · rowHash-invariant:${hm1.h === hm0.h} · moves-invariant:${hm1.m === hm0.m}`;
    }
    check('VG8o/box-selectable', selectable, selDetail);
    await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  }
  await screenshot('/tmp/vg-3d-stage.png');
}
