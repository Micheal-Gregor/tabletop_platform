// VG8a–i — GAME3D, THE A1 STAGE (I-62d: coverage lands WITH the increment, kill-first).
// The stage group: regions-vs-law, standings/chrome stamps, glide law, real input, read
// views, the six-seat orbit, the zoom ladder, and table-region anchors. Self-seeding:
// navigates game3d.html itself (fresh genesis — no state-advancing action here, all camera/
// read/selection is pure theater). Uses the bag's waitRest; keeps its VG8c-named glide.
export const suite = '3d';
export const id = 'VG8a-i';

export async function run(h) {
  const { page, check, gotoStage, waitRest, screenshot } = h;

  await gotoStage('game3d.html');
  // VG8a: mesh regions ≡ the def-derived expectation
  const rc8 = await page.evaluate(() => ({ got: window.__GAME3D__.regionCount(), want: window.__GAME3D__.expectedFromDefs() }));
  check('VG8a/3d-stage-regions-vs-law', rc8.got === rc8.want && rc8.want > 0, `${rc8.got} quads ≡ ${rc8.want} from defs`);
  // VG8b: the standings panel stamp ≡ an expectation the GATE derives from the projection
  // surface (a hardcoded or stale panel diverges and fails — the asked-text stamp class, I-62b)
  const st8 = await page.evaluate(() => ({ stamp: window.__GAME3D__.stamped('standings'), v: window.__GAME3D__.viewData() }));
  const wantLines = ['THE TABLE', ...[...st8.v.seats].sort((a, b) => b.cash - a.cash).map((s) => `${s.id === st8.v.active ? '★ ' : ''}${s.id}  $${s.cash}`)];
  check('VG8b/3d-standings-stamp-vs-projection', JSON.stringify(st8.stamp) === JSON.stringify(wantLines), `stamp [${(st8.stamp ?? []).join(' | ')}] vs law [${wantLines.join(' | ')}]`);
  // VG8c: the GLIDE obeys the preset law AT REST — seat-0 (every axis differs from default),
  // provable-move vs table, purity on re-glide (I-62c; the dead-camera class stays dead)
  const glide = async (name) => {
    await page.evaluate((n) => window.__GAME3D__.glideTo(n), name);
    try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); }
    catch { check('VG8c/3d-stage-glide-law', false, `glide to ${name} never rested (timeout)`); return null; } // named, never a crash (I-60g)
    return page.evaluate(() => window.__GAME3D__.cameraPos());
  };
  const g1 = await glide('seat-0');
  const gt = g1 && await glide('table');
  const g2 = gt && await glide('seat-0');
  if (g1 && gt && g2) {
  const pd8 = await page.evaluate(() => window.__GAME3D__.presetData('seat-0'));
  const d8 = 1900 / pd8.zoom;
  // PA-1 (I-141, superseding the I-133 mapping ON THE RECORD): a seat preset LOOKS at
  // its ring station and approaches along the seat's yaw — the want re-derives from the
  // SAME template expressions the camera consumes (ringLook + seatYawData).
  const yaw0 = await page.evaluate(() => window.__GAME3D__.seatYawData(0));
  const lk0 = await page.evaluate(() => window.__GAME3D__.ringLook(0));
  const want8 = { x: lk0.x + Math.sin(yaw0) * d8 * 0.7, y: d8 * 0.72, z: lk0.z + Math.cos(yaw0) * d8 * 0.7 };
  const near = (a, b) => Math.abs(a - b) < 1e-9; // K7-A1 D3: rest is an EXACT copy of the mapped target — identical IEEE expressions, no epsilon to hide in
  const moved8 = !(near(g1.x, gt.x) && near(g1.y, gt.y) && near(g1.z, gt.z));
  const pure8 = near(g1.x, g2.x) && near(g1.y, g2.y) && near(g1.z, g2.z);
  const lawful8 = near(g1.x, want8.x) && near(g1.y, want8.y) && near(g1.z, want8.z);
  check('VG8c/3d-stage-glide-law', moved8 && pure8 && lawful8,
    moved8 ? `seat-0 rest (${g1.x.toFixed(1)},${g1.y.toFixed(1)},${g1.z.toFixed(1)}) ≡ law (${want8.x.toFixed(1)},${want8.y.toFixed(1)},${want8.z.toFixed(1)}) · moved · pure` : 'CAMERA NEVER MOVED');
  }
  // VG8d: the header chrome speaks the projection (round + active seat)
  const hdr8 = await page.evaluate(() => ({ txt: document.getElementById('hdr').textContent, v: window.__GAME3D__.viewData() }));
  check('VG8d/3d-chrome-vs-projection', hdr8.txt.includes(`round ${hdr8.v.round}`) && hdr8.txt.includes(`${hdr8.v.active}'s turn`), hdr8.txt.slice(0, 90));
  // VG8e — REAL INPUT (K7-A1 D1 closure, kill-first): the gate drives the ACTUAL input
  // paths — a preset button click, a raycast click on a board, a wheel dolly — and the
  // unknown-preset refusal. Dead handlers now fail by name (M5 class killed).
  await page.click('[data-cam="overview"]');
  try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* named below */ }
  const btnName = await page.evaluate(() => window.__GAME3D__.camName());
  const bxy = await page.evaluate(() => window.__GAME3D__.boardScreenXY(1));
  let clickName = 'NO-BOARD-XY';
  if (bxy) {
    await page.mouse.click(bxy.x, bxy.y);
    try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* fall through */ }
    clickName = await page.evaluate(() => window.__GAME3D__.camName());
  }
  const stg = await page.locator('#stage canvas').boundingBox();
  await page.mouse.move(stg.x + stg.width / 2, stg.y + stg.height / 2);
  await page.mouse.wheel(0, -240);
  const wheelName = await page.evaluate(() => window.__GAME3D__.camName());
  const refused = await page.evaluate(() => { try { window.__GAME3D__.glideTo('nope'); return 'NO-THROW'; } catch (e) { return /unknown preset/.test(String(e)) ? 'refused-named' : 'wrong-error'; } });
  check('VG8e/3d-real-input-paths', btnName === 'overview' && clickName === 'seat-1' && wheelName === 'custom' && refused === 'refused-named',
    `button→${btnName} · board-click→${clickName} · wheel→${wheelName} · unknown-preset→${refused}`);
  // VG8f — READ VIEW (I-63, the owner's A1 playtest ruling; kill-first): flat overhead
  // for the table, face-on for a board, FIT (no bbox corner cropped), pan clamped to the
  // object, orientation unchanged while panning, re-toggle purity (pan resets).
  // table read: overhead + fit
  await page.evaluate(() => window.__GAME3D__.toggleRead('table'));
  if (await waitRest('VG8f/read-view-law')) {
    const t = await page.evaluate(() => ({
      st: window.__GAME3D__.readState(), pos: window.__GAME3D__.cameraPos(),
      look: window.__GAME3D__.lookAtPoint(), corners: window.__GAME3D__.cornersNdc(), cam: window.__GAME3D__.camName(),
      center: window.__GAME3D__.focusBoxCenter(),
    }));
    const overhead = Math.abs(t.pos.x - t.look.x) < 1e-6 && Math.abs(t.pos.z - t.look.z) < 1e-6 && t.pos.y > t.look.y;
    const fit = t.corners && t.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
    const framed = t.corners && Math.max(...t.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
    // K7-A1b D2: CENTERED — the object's bbox center sits on the optical axis (NDC origin)
    const cNdc = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), t.center);
    const centered = Math.abs(cNdc.x) < 1e-6 && Math.abs(cNdc.y) < 1e-6;
    // K7-A1b D2: SCREEN ORIENTATION — overhead read shows layout-up (world −z) as screen-up (I-63g)
    const oNdc = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z - 200), t.center);
    const oriented = oNdc.y - cNdc.y > 0 && Math.abs(oNdc.x - cNdc.x) < 1e-6;
    // pan: orientation must NOT change; the look stays inside the object's bounds even on a huge drag
    const q1 = await page.evaluate(() => window.__GAME3D__.quat());
    await page.evaluate(() => { window.__GAME3D__.panProbe(4000, 2500); });
    const afterPan = await page.evaluate(() => ({ q: window.__GAME3D__.quat(), inside: window.__GAME3D__.lookInsideFocusBox(), st: window.__GAME3D__.readState() }));
    const qSame = ['x', 'y', 'z', 'w'].every((k) => Math.abs(q1[k] - afterPan.q[k]) < 1e-9);
    const clamped = afterPan.inside === true && afterPan.st.panned === true;
    // re-toggle purity: scene → read again = fit pose restored, pan reset
    await page.evaluate(() => { window.__GAME3D__.toggleRead(); window.__GAME3D__.toggleRead('table'); });
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const t2 = await page.evaluate(() => ({ pos: window.__GAME3D__.cameraPos(), st: window.__GAME3D__.readState() }));
    const pure = Math.abs(t2.pos.x - t.pos.x) < 1e-6 && Math.abs(t2.pos.y - t.pos.y) < 1e-6 && Math.abs(t2.pos.z - t.pos.z) < 1e-6 && t2.st.panned === false;
    check('VG8f/read-view-law', t.st.mode === 'read' && t.cam === 'table:read' && overhead && centered && oriented && fit && framed && qSame && clamped && pure,
      `overhead:${overhead} centered:${centered} oriented:${oriented} fit:${fit} framed:${framed} pan-orient-stable:${qSame} pan-clamped:${clamped} retoggle-pure:${pure}`);
  }
  // board read: face-on to seat-1 (camera direction ∥ the board normal)
  await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
  await page.evaluate(() => window.__GAME3D__.toggleRead('seat-1'));
  if (await waitRest('VG8f/read-board-face-on')) {
    const b = await page.evaluate(() => ({
      pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint(),
      corners: window.__GAME3D__.cornersNdc(), cam: window.__GAME3D__.camName(),
      center: window.__GAME3D__.focusBoxCenter(),
    }));
    // face-on: the view direction matches the board normal (0, sin .25, cos .25) — dot ≈ −1 toward the board
    const dir = { x: b.look.x - b.pos.x, y: b.look.y - b.pos.y, z: b.look.z - b.pos.z };
    const len = Math.hypot(dir.x, dir.y, dir.z);
    const n = { x: 0, y: Math.sin(0.25), z: Math.cos(0.25) }; // boards rotated x by −0.25
    const dot = (dir.x * n.x + dir.y * n.y + dir.z * n.z) / len;
    const faceOn = Math.abs(dot + 1) < 1e-6;
    const fitB = b.corners && b.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
    // K7-A1b D4: the framed floor the table leg had — an all-zero corner lie dies here too
    const framedB = b.corners && Math.max(...b.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
    // K7-A1b D2 on the board leg: centered + world-up as screen-up (I-63g)
    const cNdcB = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), b.center);
    const centeredB = Math.abs(cNdcB.x) < 1e-6 && Math.abs(cNdcB.y) < 1e-6;
    const oNdcB = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y + 200, c.z), b.center);
    const orientedB = oNdcB.y - cNdcB.y > 0 && Math.abs(oNdcB.x - cNdcB.x) < 1e-6;
    check('VG8f/read-board-face-on', b.cam === 'seat-1:read' && faceOn && centeredB && orientedB && fitB && framedB,
      `dot ${dot.toFixed(6)} (want −1) · centered:${centeredB} oriented:${orientedB} fit:${fitB} framed:${framedB}`);
  }
  await screenshot('/tmp/vg-3d-read.png');
  await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {}); // K7-A1b D5: screenshot at rest

  // VG8g — THE SIX-SEAT STAGE (I-65, owner-ruled 2026-08-02; kill-first): six boards
  // two-sided, far seats approached from THEIR side, the glide ORBITS around the table
  // (never over/through), backs are shop-graphic only (no data), far boards read face-on.
  {
    // six seat groups exist
    const keys = await page.evaluate(() => window.__GAME3D__.seatGroupKeys());
    const six = JSON.stringify(keys) === JSON.stringify(['seat-0', 'seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5']);
    // far-seat approach law (I-65b; the VG8c exactness discipline): seat-4 from the FAR side
    await page.evaluate(() => window.__GAME3D__.glideTo('seat-4'));
    let lawful4 = false, restOk = true;
    try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { restOk = false; }
    if (restOk) {
      const g4 = await page.evaluate(() => window.__GAME3D__.cameraPos());
      const p4 = await page.evaluate(() => window.__GAME3D__.presetData('seat-4'));
      const d4 = 1900 / p4.zoom;
      const want4 = { x: p4.cx - 800, y: d4 * 0.72, z: p4.cy - 500 - d4 * 0.7 };
      lawful4 = Math.abs(g4.x - want4.x) < 1e-9 && Math.abs(g4.y - want4.y) < 1e-9 && Math.abs(g4.z - want4.z) < 1e-9;
    }
    check('VG8g/six-seats-far-approach', six && restOk && lawful4,
      `six:${six} · far-law:${lawful4}${restOk ? '' : ' · GLIDE TIMEOUT'}`);

    // ORBITAL GLIDE (I-65d): seat-1 → seat-4 crosses sides; the camera's horizontal
    // radius about the table center must NEVER collapse (a straight line cuts across).
    await page.evaluate(() => window.__GAME3D__.glideTo('seat-1'));
    try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* named below */ }
    const r0 = await page.evaluate(() => { const p = window.__GAME3D__.cameraPos(); return Math.hypot(p.x, p.z); });
    await page.evaluate(() => window.__GAME3D__.glideTo('seat-4'));
    let minR = Infinity, orbitRest = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const s = await page.evaluate(() => ({ p: window.__GAME3D__.cameraPos(), g: window.__GAME3D__.gliding() }));
      minR = Math.min(minR, Math.hypot(s.p.x, s.p.z));
      if (!s.g) { orbitRest = true; break; }
      await new Promise((r) => setTimeout(r, 25));
    }
    const r1 = await page.evaluate(() => { const p = window.__GAME3D__.cameraPos(); return Math.hypot(p.x, p.z); });
    const orbital = orbitRest && minR >= 0.7 * Math.min(r0, r1);
    check('VG8g/orbital-glide-around', orbital,
      orbitRest ? `minR ${minR.toFixed(0)} vs wall ${(0.7 * Math.min(r0, r1)).toFixed(0)} (r0 ${r0.toFixed(0)} r1 ${r1.toFixed(0)})` : 'orbit glide never rested (timeout)');

    // K7-A1c' D4: SHORTEST ARC has its own falsifier. seat-0 → seat-3 has a RAW arc of
    // ~234.9° — the lawful glide sweeps the SHORT way (~125°); the long way is a gate-
    // visible violation. Swept azimuth is accumulated from unwrapped samples.
    await page.evaluate(() => window.__GAME3D__.glideTo('seat-0'));
    try { await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }); } catch { /* named below */ }
    let prevA = await page.evaluate(() => { const p = window.__GAME3D__.cameraPos(); return Math.atan2(p.z, p.x); });
    await page.evaluate(() => window.__GAME3D__.glideTo('seat-3'));
    let swept = 0, arcRest = false;
    const ta = Date.now();
    while (Date.now() - ta < 60000) {
      const s = await page.evaluate(() => ({ p: window.__GAME3D__.cameraPos(), g: window.__GAME3D__.gliding() }));
      const a = Math.atan2(s.p.z, s.p.x);
      let da = a - prevA;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      swept += da;
      prevA = a;
      if (!s.g) { arcRest = true; break; }
      await new Promise((r) => setTimeout(r, 25));
    }
    const sweptDeg = (swept * 180) / Math.PI;
    const shortArc = arcRest && Math.abs(sweptDeg) <= 190;
    check('VG8g/orbital-shortest-arc', shortArc,
      arcRest ? `seat-0→seat-3 swept ${sweptDeg.toFixed(1)}° (short-arc wall 190°)` : 'shortest-arc glide never rested (timeout)');

    // BACKS ARE SHOP-GRAPHIC ONLY (I-65c): every seat board — front carries the data
    // ($), the back carries the shop identity and NO data. Contrast pair per board.
    const stamps = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.boardStamps(i)));
    const backsOk = stamps.every((st, i) =>
      st && st.front && st.back
      && st.front.some((l) => l.includes('$'))
      && !st.back.some((l) => l.includes('$'))
      && st.back.length === 2 && st.back[1] === '[shop art]');
    // K7-A1c D2: the back must FACE BACKWARD — a wrong-facing (invisible) back is a lie
    // the stamp alone cannot catch. World-normal of the back ≈ −(board front normal).
    const backDots = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.backFacingDot(i)));
    const backsOpposed = backDots.every((d) => d !== null && Math.abs(d + 1) < 1e-6);
    check('VG8g/backs-shop-graphic-only', backsOk && backsOpposed,
      stamps.map((st, i) => `${i}:${st && st.back ? (st.back.some((l) => l.includes('$')) ? 'LEAK' : 'ok') : 'MISSING'}`).join(' ')
      + ` · opposed:${backsOpposed} (dots ${backDots.map((d) => (d === null ? 'null' : d.toFixed(3))).join(',')})`);

    // A5 (I-128) · shop-board-data-true: every board's building-tier / jobs-list stamps
    // TEXT-equal the fresh projection derivation (render-walk, the independent read) —
    // teeth even at zero crew ('no jobs in queue' must be STAMPED, never absent; the
    // K7-Q M7 vacuity lesson). KILL: remove the A5 fills from seats.ts → the walk finds
    // no lines for the region → match false → THIS fails by name.
    const fills = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.shopFillsTrue(i)));
    const fillsOk = fills.every((f) => f && f.match);
    check('VG8g2/shop-board-data-true', fillsOk,
      fills.map((f, i) => `${i}:${f ? (f.match ? 'ok' : `MISMATCH tier"${f.got.tier}"≟"${f.want.tier}" jobs"${f.got.jobs}"≟"${f.want.jobs}"`) : 'NULL'}`).join(' · '));

    // PA-1 (I-141) · ring-stations: every board stands ON THE RING — equidistant at the
    // template's derived radius, yawed to its own angle (supersedes the L-5 corner pins
    // BY the owner's own template). The wants derive from the SAME playarea expressions
    // the boards consume. KILL: hand-place any seat → its radius/yaw diverges → fails.
    const poses = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.boardPose(i)));
    const ring = await page.evaluate(() => window.__GAME3D__.ringInfo());
    const yawsAll = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.seatYawData(i)));
    const ringOk = poses.every((p, i) => {
      if (!p) return false;
      const wx = Math.sin(yawsAll[i]) * ring.r, wz = Math.cos(yawsAll[i]) * ring.r;
      const yawWant = (yawsAll[i] * 180) / Math.PI;
      let dy = Math.abs(p.yawDeg - yawWant) % 360;
      if (dy > 180) dy = 360 - dy;
      return Math.hypot(p.x - wx, p.z - wz) < 2 && dy < 1;
    });
    check('VG8g3/ring-stations', ringOk && ring.r > 400,
      poses.map((p, i) => `${i}:${p ? `${p.yawDeg.toFixed(0)}°@r${Math.hypot(p.x, p.z).toFixed(0)}` : 'NULL'}`).join(' · ') + ` (want equidistant at r=${ring.r.toFixed(0)} — the PA-1 template, I-141)`);

    // L-4 (I-131) · seat-rows-law: every seat's RENDERED rows ≡ the pure planner's plan
    // (the planner's own laws live in vitest — seat-rows.test.ts); the viewer's HAND
    // stages BELOW the books (farther from the table than the ledger, count = the SVG
    // hand law). Non-vacuous at genesis: moe has crew, ownDiscard 0 → hand 0 is the
    // LAWFUL want (count-true both ways). KILL: stop consuming the plan → match false.
    const rowsInfo = await page.evaluate(() => [0, 1, 2, 3, 4, 5].map((i) => window.__GAME3D__.seatRowsInfo(i)));
    const rowsOk = rowsInfo.every((r) => r && r.match) && rowsInfo[0].got.crew >= 1;
    const hand = await page.evaluate(() => window.__GAME3D__.handInfo());
    const handOk = !!hand && hand.count === hand.want && hand.belowBooks;
    check('VG8g4/seat-rows-law', rowsOk && handOk,
      rowsInfo.map((r, i) => `${i}:${r ? (r.match ? `ok(${r.got.crew}c/${r.got.equipment}e/${r.got.local}l)` : 'MISMATCH') : 'NULL'}`).join(' · ')
      + ` · hand:${hand ? `${hand.count}/${hand.want} below-books:${hand.belowBooks}` : 'NULL'} (I-131)`);

    // O-2 (I-146) · station-box-contained: every viewer-station mesh inside the box
    // rect (frame-relative). KILL: move any packing offset out → named card listed.
    const sb = await page.evaluate(() => window.__GAME3D__.stationBoxInfo());
    check('VG8g5/station-box-contained', !!sb && sb.contained && sb.checked > 0,
      sb ? `${sb.checked} station meshes · outside: ${sb.outside.length ? sb.outside.join(', ') : 'NONE'} (box ±${sb.box.halfW}×${sb.box.depth} — I-146)` : 'NULL');

    // O-5 (I-146) · slabs-present: the table's slab + six board backings — thickness
    // as geometry (1 + 6 = 7 slab bodies). KILL: drop a slab → count short.
    const slabs = await page.evaluate(() => window.__GAME3D__.slabCount());
    check('VG8g6/slabs-present', slabs === 7, `${slabs} slab bodies (want 7: the table + six boards — O-5/I-146)`);

    // L-3 (I-130) · medal-in-region: the 3D BOTY medal STANDS in the freed bottom-right
    // medal region — parts built, resting ON the table, centre INSIDE the region rect
    // (geometry state, never pixels). The re-rowed table (dice far right · BBB +
    // networking staged decks · windows REMOVED) is covered by the region-count law
    // above (VG8a re-derives from the changed defs on both sides). KILL: unregister the
    // medal component → medalInfo null → fails by name.
    const med = await page.evaluate(() => window.__GAME3D__.medalInfo());
    check('VG8h2/medal-in-region', !!med && med.parts >= 10 && med.onTable && med.inRegion,
      med ? `parts:${med.parts} (want ≥10 — disc+ribbon form) · on-table:${med.onTable} · in-region:${med.inRegion} — the BOTY medal holds the freed corner (I-130)` : 'NULL — no medal in the scene');

    // far board read: face-on along the FAR normal (0, sin.25, −cos.25) + full pose law
    await page.evaluate(() => window.__GAME3D__.toggleRead('seat-4'));
    if (await waitRest('VG8g/read-far-board-face-on')) {
      const f = await page.evaluate(() => ({
        pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint(),
        corners: window.__GAME3D__.cornersNdc(), cam: window.__GAME3D__.camName(),
        center: window.__GAME3D__.focusBoxCenter(),
      }));
      const dirF = { x: f.look.x - f.pos.x, y: f.look.y - f.pos.y, z: f.look.z - f.pos.z };
      const lenF = Math.hypot(dirF.x, dirF.y, dirF.z);
      // PA-2 (I-142): seat-4 rides the ring (no longer 180°) — the want normal DERIVES
      // from its yaw: n = (sin·cos0.25, sin0.25, cos·cos0.25). The LAW is face-the-board.
      const yaw4 = await page.evaluate(() => window.__GAME3D__.seatYawData(4));
      const nF = { x: Math.sin(yaw4) * Math.cos(0.25), y: Math.sin(0.25), z: Math.cos(yaw4) * Math.cos(0.25) };
      const dotF = (dirF.x * nF.x + dirF.y * nF.y + dirF.z * nF.z) / lenF;
      const faceOnF = Math.abs(dotF + 1) < 1e-6;
      const fitF = f.corners && f.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
      const framedF = f.corners && Math.max(...f.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
      const cNdcF = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), f.center);
      const centeredF = Math.abs(cNdcF.x) < 1e-6 && Math.abs(cNdcF.y) < 1e-6;
      const oNdcF = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y + 200, c.z), f.center);
      const orientedF = oNdcF.y - cNdcF.y > 0 && Math.abs(oNdcF.x - cNdcF.x) < 1e-6;
      check('VG8g/read-far-board-face-on', f.cam === 'seat-4:read' && faceOnF && centeredF && orientedF && fitF && framedF,
        `dot ${dotF.toFixed(6)} (want −1) · centered:${centeredF} oriented:${orientedF} fit:${fitF} framed:${framedF}`);
    }
    await page.evaluate(() => { window.__GAME3D__.toggleRead(); });
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  }

  // VG8h — THE ZOOM LADDER (I-66, the owner's exact A1c-playtest walk IS the law;
  // REAL wheel input): anchor-READ ↔ anchor-SCENE ↔ OVERVIEW ↔ TABLE-READ, read
  // zoom-in DISABLED, the anchor surviving the whole walk. Superseded checks
  // (A1c continuum endpoints/walls) replaced by this walk on the record (I-64 strikes).
  {
    const stgBox = await page.locator('#stage canvas').boundingBox();
    await page.mouse.move(stgBox.x + stgBox.width / 2, stgBox.y + stgBox.height / 2);
    await page.click('[data-cam="seat-0"]'); // the owner's walk starts: seat-0 scene (a real re-anchoring click)
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    await page.mouse.move(stgBox.x + stgBox.width / 2, stgBox.y + stgBox.height / 2); // wheel targets the canvas, not the bar
    // rung 1→0: wheel-in → seat-0 READ, organically
    let entered = false;
    for (let i = 0; i < 40 && !entered; i++) {
      await page.mouse.wheel(0, -240);
      entered = await page.evaluate(() => window.__GAME3D__.zoomState().mode === 'read');
    }
    const zIn = await page.evaluate(() => window.__GAME3D__.zoomState());
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const inName = await page.evaluate(() => window.__GAME3D__.camName());
    const organicIn = entered && zIn.focus === 'seat-0' && inName === 'seat-0:read';
    // I-66c: read zoom-in is DISABLED — three more in-notches move NOTHING
    const posBefore = await page.evaluate(() => window.__GAME3D__.cameraPos());
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -240);
    const posAfter = await page.evaluate(() => ({ p: window.__GAME3D__.cameraPos(), z: window.__GAME3D__.zoomState() }));
    const inDisabled = posAfter.z.mode === 'read' && posAfter.z.focus === 'seat-0'
      && Math.abs(posAfter.p.x - posBefore.x) < 1e-9 && Math.abs(posAfter.p.y - posBefore.y) < 1e-9 && Math.abs(posAfter.p.z - posBefore.z) < 1e-9;
    // rung 0→1: wheel-out ONCE → the ANCHOR'S scene view (never a table-read hop)
    await page.mouse.wheel(0, 240);
    const backScene = await page.evaluate(() => ({ z: window.__GAME3D__.zoomState(), cam: window.__GAME3D__.camName() }));
    const outToAnchorScene = backScene.z.mode === 'scene' && backScene.cam === 'seat-0';
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    // rung 1→2: wheel-out until OVERVIEW
    let atOverview = false;
    for (let i = 0; i < 40 && !atOverview; i++) {
      await page.mouse.wheel(0, 240);
      atOverview = await page.evaluate(() => window.__GAME3D__.camName() === 'overview');
    }
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    // rung 2→3: one more out-notch at overview → TABLE READ; then out is a NO-OP terminal
    await page.mouse.wheel(0, 240);
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const tr = await page.evaluate(() => ({ cam: window.__GAME3D__.camName(), z: window.__GAME3D__.zoomState(), pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint() }));
    const atTableRead = tr.z.mode === 'read' && tr.z.focus === 'table' && tr.cam === 'table:read'
      && Math.abs(tr.pos.x - tr.look.x) < 1e-6 && Math.abs(tr.pos.z - tr.look.z) < 1e-6 && tr.pos.y > tr.look.y;
    const anchorHeld1 = tr.z.lastFocus === 'seat-0'; // the anchor SURVIVED the out-walk
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 240);
    const trStill = await page.evaluate(() => ({ cam: window.__GAME3D__.camName(), p: window.__GAME3D__.cameraPos() }));
    const farTerminal = trStill.cam === 'table:read'
      && Math.abs(trStill.p.x - tr.pos.x) < 1e-9 && Math.abs(trStill.p.y - tr.pos.y) < 1e-9 && Math.abs(trStill.p.z - tr.pos.z) < 1e-9;
    check('VG8h/ladder-out', organicIn && inDisabled && outToAnchorScene && atOverview && atTableRead && anchorHeld1 && farTerminal,
      `organic-in:${organicIn} (${inName}) · in-disabled:${inDisabled} · out-to-anchor-scene:${outToAnchorScene} (${backScene.cam}) · overview:${atOverview} · table-read:${atTableRead} · anchor-held:${anchorHeld1} · far-terminal:${farTerminal}`);
    // the walk back IN: table read → overview → the ANCHOR's scene (seat-0)
    await page.mouse.wheel(0, -240);
    const backOv = await page.evaluate(() => ({ cam: window.__GAME3D__.camName(), z: window.__GAME3D__.zoomState() }));
    const inToOverview = backOv.z.mode === 'scene' && backOv.cam === 'overview';
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    await page.mouse.wheel(0, -240);
    const backAnchor = await page.evaluate(() => ({ cam: window.__GAME3D__.camName(), z: window.__GAME3D__.zoomState() }));
    const inToAnchor = backAnchor.z.mode === 'scene' && backAnchor.cam === 'seat-0';
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    check('VG8h/ladder-back', inToOverview && inToAnchor,
      `table-read-in-to-overview:${inToOverview} (${backOv.cam}) · overview-in-to-anchor:${inToAnchor} (${backAnchor.cam})`);
  }

  // VG8i — TABLE REGIONS ARE ANCHORS (I-66d; real click + real wheel): click the LOG
  // region → anchored table:log; zoom in → THAT REGION's overhead read, fit+centered;
  // zoom out → the region's scene = the TABLE preset. (The exemplar moved off the deck
  // at A2 — the deck click now carries the draw verb, I-67d.)
  {
    await page.click('[data-cam="table"]');
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const stgBox2 = await page.locator('#stage canvas').boundingBox();
    await page.mouse.move(stgBox2.x + stgBox2.width / 2, stgBox2.y + stgBox2.height / 2);
    const rxy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('log'));
    let regionOk = false, detail = 'NO-REGION-XY';
    if (rxy) {
      await page.mouse.click(rxy.x, rxy.y);
      await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
      const anch = await page.evaluate(() => window.__GAME3D__.zoomState().lastFocus);
      // wheel in → the region's read
      let inRegionRead = false;
      for (let i = 0; i < 40 && !inRegionRead; i++) {
        await page.mouse.wheel(0, -240);
        inRegionRead = await page.evaluate(() => { const z = window.__GAME3D__.zoomState(); return z.mode === 'read' && z.focus === 'table:log'; });
      }
      await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
      const rr = await page.evaluate(() => ({
        cam: window.__GAME3D__.camName(), corners: window.__GAME3D__.cornersNdc(), center: window.__GAME3D__.focusBoxCenter(),
        pos: window.__GAME3D__.cameraPos(), look: window.__GAME3D__.lookAtPoint(),
      }));
      const fitR = rr.corners && rr.corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
      const framedR = rr.corners && Math.max(...rr.corners.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y)))) >= 0.5;
      const cN = await page.evaluate((c) => window.__GAME3D__.ndcOf(c.x, c.y, c.z), rr.center);
      const centeredR = Math.abs(cN.x) < 1e-6 && Math.abs(cN.y) < 1e-6;
      const overheadR = Math.abs(rr.pos.x - rr.look.x) < 1e-6 && Math.abs(rr.pos.z - rr.look.z) < 1e-6 && rr.pos.y > rr.look.y;
      // K7-A1d D1: region-read zoom-in is DISABLED too (I-66c holds on EVERY read leg)
      for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -240);
      const rIn = await page.evaluate(() => ({ p: window.__GAME3D__.cameraPos(), cam: window.__GAME3D__.camName() }));
      const inDisabledR = rIn.cam === 'table:log:read'
        && Math.abs(rIn.p.x - rr.pos.x) < 1e-9 && Math.abs(rIn.p.y - rr.pos.y) < 1e-9 && Math.abs(rIn.p.z - rr.pos.z) < 1e-9;
      // K7-A1d D2: region pan CLAMPS WITHIN THE REGION (a huge drag cannot leave its box)
      const qR1 = await page.evaluate(() => window.__GAME3D__.quat());
      await page.evaluate(() => { window.__GAME3D__.panProbe(4000, 2500); });
      const rPan = await page.evaluate(() => ({ q: window.__GAME3D__.quat(), inside: window.__GAME3D__.lookInsideFocusBox(), look: window.__GAME3D__.lookAtPoint() }));
      const qStableR = ['x', 'y', 'z', 'w'].every((k) => Math.abs(qR1[k] - rPan.q[k]) < 1e-9);
      const panClampedR = rPan.inside === true && qStableR;
      // wheel out → the region's scene = the table preset (anchor still the region)
      await page.mouse.wheel(0, 240);
      const rs = await page.evaluate(() => ({ cam: window.__GAME3D__.camName(), z: window.__GAME3D__.zoomState() }));
      const outToTableScene = rs.z.mode === 'scene' && rs.cam === 'table' && rs.z.lastFocus === 'table:log';
      await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
      regionOk = anch === 'table:log' && inRegionRead && rr.cam === 'table:log:read' && fitR && framedR && centeredR && overheadR && inDisabledR && panClampedR && outToTableScene;
      detail = `click-anchored:${anch === 'table:log'} (${anch}) · region-read:${inRegionRead} (${rr.cam}) · fit:${fitR} framed:${framedR} centered:${centeredR} overhead:${overheadR} · in-disabled:${inDisabledR} · pan-clamped:${panClampedR} · out-to-table-scene:${outToTableScene}`;
    }
    check('VG8i/table-region-anchor-read', regionOk, detail);
    await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  }
}
