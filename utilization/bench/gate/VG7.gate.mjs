// VG7 — THE 3D SPIKE (spike3d.html) — a 3D-suite group. Geometry vs LAW (defs-side count),
// the HK-11 flip with a COMMITTED forced-mismatch drill (kill-first law), and the
// preset-consuming camera. All waits are on STATE (I-60f). No pixel hashes (I-57c).
// Self-seeding: navigates spike3d.html itself. (The task's group list enumerated VG8*; VG7
// is carried here as a 3d-suite module so the FULL battery reproduces the monolith's 50.)
export const suite = '3d';
export const id = 'VG7';

export async function run(h) {
  const { page, check, gotoStage, screenshot } = h;

  await gotoStage('spike3d.html');
  // VG7a: mesh quads ≡ the def-derived expectation (M-A class: a dropped region fails)
  const rc = await page.evaluate(() => ({ got: window.__SPIKE__.regionCount(), want: window.__SPIKE__.expectedFromDefs() }));
  check('VG7a/3d-regions-vs-law', rc.got === rc.want && rc.want > 0, `${rc.got} quads ≡ ${rc.want} from defs`);
  // graceful VG7 waits (K7-3d-R D4): a hung verdict FAILS the named check, never crashes the gate
  const waitVerdict = async (name) => {
    try { await page.waitForFunction(() => window.__SPIKE__.verdict() !== null, null, { timeout: 60000 }); return true; }
    catch { check(name, false, 'verdict never arrived (timeout) — the HK-11 completion path is dead'); return false; }
  };
  // VG7b: the honest flip — displayed READ from the RENDERED title label (M-MIRROR killed:
  // a reverted fill renders '[title]', which cannot equal the seed)
  await page.evaluate(() => window.__SPIKE__.flip());
  if (await waitVerdict('VG7b/3d-flip-hk11-in-sync')) {
    const v1 = await page.evaluate(() => window.__SPIKE__.verdict());
    check('VG7b/3d-flip-hk11-in-sync', v1.ok === true && v1.displayed === v1.result, `displayed "${v1.displayed}" · result "${v1.result}"`);
  }
  // VG7c: the COMMITTED forced mismatch — truth must win (displayed lies, result = seed)
  await page.evaluate(() => { window.__SPIKE__.resetFlip(); window.__SPIKE__.forceMismatch(); });
  if (await waitVerdict('VG7c/3d-theater-truth-wins')) {
    const v2 = await page.evaluate(() => window.__SPIKE__.verdict());
    check('VG7c/3d-theater-truth-wins', v2.ok === false && v2.displayed === 'wrong-card' && v2.result !== 'wrong-card', `displayed "${v2.displayed}" → truth "${v2.result}"`);
  }
  // VG7d — K7-3d-R D1-R2 (the dead-camera class, killed properly this time): assert on
  // SEAT-0, whose mapped position differs from the default on EVERY axis (table's cx
  // equals the world center, which let a no-op camera pass); re-derive x/y/z from the
  // preset DATA via the pinned mapping; and the camera must PROVABLY MOVE between
  // presets (the I-57d law carried into 3D). Boundary on the record: a byte-identical
  // hardcoded copy of the same mapping is the accepted equivalent-mutant class (I-60g).
  const cam = await page.evaluate(() => {
    document.querySelector('[data-cam="seat-0"]').click();
    const p1 = window.__SPIKE__.cameraPos();
    document.querySelector('[data-cam="table"]').click();
    const pt = window.__SPIKE__.cameraPos();
    document.querySelector('[data-cam="seat-0"]').click();
    return { p1, pt, p2: window.__SPIKE__.cameraPos(), d: window.__SPIKE__.presetData('seat-0') };
  });
  const dist = 1900 / cam.d.zoom;
  const want = { x: cam.d.cx - 800, y: dist * 0.72, z: cam.d.cy - 500 + dist * 0.7 };
  const close = (a, b) => Math.abs(a - b) < 1e-6;
  const moved7 = !(close(cam.p1.x, cam.pt.x) && close(cam.p1.y, cam.pt.y) && close(cam.p1.z, cam.pt.z));
  const pure7 = close(cam.p1.x, cam.p2.x) && close(cam.p1.y, cam.p2.y) && close(cam.p1.z, cam.p2.z);
  const lawful7 = close(cam.p1.x, want.x) && close(cam.p1.y, want.y) && close(cam.p1.z, want.z);
  check('VG7d/3d-camera-consumes-presets', moved7 && pure7 && lawful7,
    moved7 ? `seat-0 (${cam.p1.x.toFixed(1)},${cam.p1.y.toFixed(1)},${cam.p1.z.toFixed(1)}) ≡ law (${want.x.toFixed(1)},${want.y.toFixed(1)},${want.z.toFixed(1)}) · moved vs table · pure` : 'CAMERA NEVER MOVED between presets');
  await screenshot('/tmp/vg-3d.png');
}
