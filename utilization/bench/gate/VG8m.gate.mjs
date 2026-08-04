// VG8m — A4 (I-73) + K-E free-tumble (I-81) + P-1 size/home (I-83; kill-first): THE
// ROUND-CARD SEQUENCE + a SEEDED ROLLING EXHIBIT die. Reload game3d for a clean genesis
// (moe active = the VIEWING seat). The die is an EXHIBIT — the slice has NO engine die
// verb — so it touches NO game state: rowHash AND moveCount are invariant through every
// roll and fidget. P-1: the die is HALF its old size (edge ≈ 5% of the table width), is
// built AT its `table:dice`-region HOME, and after every settled result GLIDES back home
// (fixed starting position — never "random on the table"). Assert geometry/verdict STATE,
// never pixels (I-57c); WAIT ON diePhase STATE, never clocks (I-60f). SELF-SEEDING (its
// own clean genesis nav), so it PASSES in isolation. 10 checks.
export const suite = '3d';
export const id = 'VG8m';

export async function run(h) {
  const { page, check, gotoStage, screenshot } = h;

  {
    await gotoStage('game3d.html');
    await page.evaluate(() => window.__GAME3D__.glideTo('table'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const hashesM = () => page.evaluate(() => ({ h: window.__GAME3D__.rowHash(), m: window.__GAME3D__.moveCount() }));
    const waitDieRest = async (name) => {
      try { await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'rest', null, { timeout: 60000 }); return true; }
      catch { check(name, false, 'die roll never settled (timeout)'); return false; } // named, never a crash (I-60g)
    };
    const waitDieIdle = async (name) => {
      try { await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'idle', null, { timeout: 60000 }); return true; }
      catch { check(name, false, 'die never returned to idle/home (timeout)'); return false; } // named, never a crash (I-60g)
    };
    // A REAL click on the die (re-fetching its screen point — the die MOVES each roll),
    // confirming the roll STARTED (diePhase → 'rolling') then WAITING ON its settle STATE
    // (I-60f). Reads the rest STATE (the seeded landing spot) DURING the readable hold,
    // then waits out the return-home glide (P-1, I-83) so the next click finds the die at
    // its home. K-E (I-81) free-tumble law unchanged: the landing spans the whole table.
    const rollOnce = async (name) => {
      const xy = await page.evaluate(() => window.__GAME3D__.dieScreenXY());
      if (!xy) return null;
      await page.mouse.click(xy.x, xy.y);
      try { await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'rolling', null, { timeout: 8000 }); }
      catch { return null; } // the click missed the die — a failed roll, not a settle
      if (!(await waitDieRest(name))) return null;
      const info = await page.evaluate(() => window.__GAME3D__.dieRestInfo());
      if (!(await waitDieIdle(name))) return null; // the return-home is part of the cycle
      return info;
    };

    // die-face-count: exactly SIX pip faces, values 1..6 (a standard die).
    const faces = await page.evaluate(() => window.__GAME3D__.dieFaces());
    check('VG8m/die-face-count', JSON.stringify(faces) === JSON.stringify([1, 2, 3, 4, 5, 6]),
      `die faces [${(faces ?? []).join(',')}] (want 1..6)`);

    // die-size-proportion (P-1, I-83 — the check that CATCHES "way too big for the board"):
    // the die's rest bbox EDGE (a geometry read, never the constant against itself) is a
    // small fraction of the table width — within [0.03, 0.07]. Kill: DIE_SIZE=90 → 0.10 →
    // out of band → false.
    const rect0 = await page.evaluate(() => window.__GAME3D__.dieTableRect());
    const rest0 = await page.evaluate(() => window.__GAME3D__.dieRestInfo());
    let sizeOk = false, sizeDetail = 'NO-RECT-OR-REST';
    if (rect0 && rest0) {
      const frac = rest0.edge / (rect0.maxX - rect0.minX);
      sizeOk = frac >= 0.03 && frac <= 0.07;
      sizeDetail = `die edge ${rest0.edge.toFixed(1)} / table ${(rect0.maxX - rect0.minX).toFixed(0)} = ${frac.toFixed(3)} (want 0.03–0.07)`;
    }
    check('VG8m/die-size-proportion', sizeOk, sizeDetail);

    // die-home-genesis (P-1, I-83 — the "starting position is random" fix, half 1): BEFORE
    // any roll the die sits AT its derived home (the `table:dice` region centre). The home
    // comes from the REGION object's bbox, the position from the die MESH — two sources.
    const home0 = await page.evaluate(() => window.__GAME3D__.dieHome());
    const region0 = await page.evaluate(() => window.__GAME3D__.dieRegionCenter()); // INDEPENDENT source (K7-P D5)
    let homeGenOk = false, homeGenDetail = 'NO-HOME';
    if (home0 && rest0 && region0) {
      const d0 = Math.hypot(rest0.x - home0.x, rest0.z - home0.z);
      const dr = Math.hypot(home0.x - region0.x, home0.z - region0.z);
      homeGenOk = d0 < 10 && dr < 10; // position ≈ home AND home ≈ the live dice REGION centre
      homeGenDetail = `genesis position (${rest0.x.toFixed(0)},${rest0.z.toFixed(0)}) vs home (${home0.x.toFixed(0)},${home0.z.toFixed(0)}) Δ${d0.toFixed(1)} (<10) · home vs region-centre (${region0.x.toFixed(0)},${region0.z.toFixed(0)}) Δ${dr.toFixed(1)} (<10)`;
    }
    check('VG8m/die-home-genesis', homeGenOk, homeGenDetail);

    // die-free-tumble (K-E, I-81 — the check that CATCHES batch-1's "caged to a square"):
    // across several SEEDED rolls the die TRAVELS and its settle points SPREAD across a
    // LARGE fraction of the WHOLE table area (>> the old ~16%-of-table dice sub-square),
    // and EVERY settle lands WITHIN the table bbox. Geometry STATE, never pixels (I-57c);
    // wait on diePhase STATE, never clocks (I-60f). The die area is the LIVE table bbox.
    const rect = await page.evaluate(() => window.__GAME3D__.dieTableRect());
    const settles = [];
    let tumbleOk = false, tumbleDetail = 'NO-TABLE-RECT';
    if (rect) {
      for (let i = 0; i < 6; i++) {
        const info = await rollOnce('VG8m/die-free-tumble');
        if (!info) break;
        settles.push({ x: info.x, z: info.z });
      }
      if (settles.length >= 6) {
        const xs = settles.map((s) => s.x), zs = settles.map((s) => s.z);
        const spreadX = Math.max(...xs) - Math.min(...xs), spreadZ = Math.max(...zs) - Math.min(...zs);
        const tableW = rect.maxX - rect.minX, tableD = rect.maxZ - rect.minZ;
        const oldCageW = tableW * 0.16; // the old dice region was w:16/100 of the table width
        const withinTable = settles.every((s) => s.x >= rect.minX && s.x <= rect.maxX && s.z >= rect.minZ && s.z <= rect.maxZ);
        const spanned = spreadX > tableW * 0.4 && spreadZ > tableD * 0.4;
        tumbleOk = spanned && spreadX > oldCageW * 2 && withinTable;
        tumbleDetail = `spreadX ${spreadX.toFixed(0)}/${tableW.toFixed(0)} (>${(tableW * 0.4).toFixed(0)} & >>old-cage ${oldCageW.toFixed(0)}) · spreadZ ${spreadZ.toFixed(0)}/${tableD.toFixed(0)} (>${(tableD * 0.4).toFixed(0)}) · all-within-table:${withinTable} · settles ${settles.length}`;
      } else tumbleDetail = `only ${settles.length}/6 rolls settled`;
    }
    check('VG8m/die-free-tumble', tumbleOk, tumbleDetail);

    // die-returns-home (P-1, I-83 — the "starting position is random" fix, half 2): after a
    // FULL roll cycle (settle → readable hold → return glide, waited as STATE never clocks,
    // I-60f) the die is back AT its home — every toss starts from the same spot. Kill: drop
    // the return glide → the die stays at its last landing → Δ large → false.
    const homeR = await page.evaluate(() => window.__GAME3D__.dieHome());
    const restH = await page.evaluate(() => window.__GAME3D__.dieRestInfo());
    let retOk = false, retDetail = 'NO-HOME-OR-REST';
    if (homeR && restH) {
      const dr = Math.hypot(restH.x - homeR.x, restH.z - homeR.z);
      retOk = dr < 10 && settles.length >= 6; // the 6 free-tumble rolls all cycled home
      retDetail = `after ${settles.length} full roll cycles the die sits at (${restH.x.toFixed(0)},${restH.z.toFixed(0)}) vs home (${homeR.x.toFixed(0)},${homeR.z.toFixed(0)}) Δ${dr.toFixed(1)} (<10)`;
    }
    check('VG8m/die-returns-home', retOk, retDetail);

    // die-on-table (K-E, I-81): at rest the die sits ON TOP of the table — its bbox
    // UNDERSIDE y ≈ the table-top y AND its centre x/z within the table bounds. STATE, not
    // pixels (I-57c). Kill: float the die above / off the surface → underside ≠ top → fails.
    const restI = await page.evaluate(() => window.__GAME3D__.dieRestInfo());
    let onTableOk = false, onTableDetail = 'NO-REST';
    if (restI && rect) {
      const onSurface = Math.abs(restI.underY - rect.topY) < 3;
      const inBounds = restI.x >= rect.minX && restI.x <= rect.maxX && restI.z >= rect.minZ && restI.z <= rect.maxZ;
      onTableOk = onSurface && inBounds;
      onTableDetail = `underside y ${restI.underY.toFixed(2)} ≈ table-top ${rect.topY.toFixed(2)} (Δ${Math.abs(restI.underY - rect.topY).toFixed(2)}<3):${onSurface} · centre (${restI.x.toFixed(0)},${restI.z.toFixed(0)}) within table:${inBounds}`;
    }
    check('VG8m/die-on-table', onTableOk, onTableDetail);

    // die-roll-hk11: on the VIEWER'S turn (moe) a REAL click on the die rolls the SEEDED
    // toss; at settle the DISPLAYED up-face EQUALS the seeded result (HK-11, no mismatch),
    // and the die touched NO game state (rowHash + moveCount invariant — the EXHIBIT law).
    await waitDieIdle('VG8m/die-roll-hk11'); // the die must be home (idle) before the click
    const dieXY = await page.evaluate(() => window.__GAME3D__.dieScreenXY());
    const preRoll = await hashesM();
    let hk11Ok = false, hk11Detail = 'NO-DIE-XY';
    if (dieXY) {
      await page.mouse.click(dieXY.x, dieXY.y);
      if (await waitDieRest('VG8m/die-roll-hk11')) {
        const v1 = await page.evaluate(() => window.__GAME3D__.dieVerdict());
        const up1 = await page.evaluate(() => window.__GAME3D__.dieUpFace());
        const postRoll = await hashesM();
        const stateInvariant = postRoll.h === preRoll.h && postRoll.m === preRoll.m;
        hk11Ok = !!(v1 && v1.mismatch === false && up1 === v1.seeded && v1.displayed === v1.seeded && stateInvariant);
        hk11Detail = `up-face ${up1} ≡ seeded ${v1 && v1.seeded} · displayed ${v1 && v1.displayed} · mismatch:${v1 && v1.mismatch} · state-invariant:${stateInvariant}`;
      }
    }
    check('VG8m/die-roll-hk11', hk11Ok, hk11Detail);

    // forced-mismatch-truth-wins (the VG7d / I-67c committed drill): the toss settles on a
    // DIFFERENT face (the lie), HK-11 FLAGS it, and TRUTH WINS — the die re-settles so the
    // final up-face is the SEEDED value.
    await waitDieIdle('VG8m/forced-mismatch-truth-wins'); // wait out the previous return
    await page.evaluate(() => window.__GAME3D__.forceDieMismatch(true));
    const dieXY2 = await page.evaluate(() => window.__GAME3D__.dieScreenXY());
    let tw = false, twDetail = 'NO-DIE-XY';
    if (dieXY2) {
      await page.mouse.click(dieXY2.x, dieXY2.y);
      if (await waitDieRest('VG8m/forced-mismatch-truth-wins')) {
        const v2 = await page.evaluate(() => window.__GAME3D__.dieVerdict());
        const up2 = await page.evaluate(() => window.__GAME3D__.dieUpFace());
        tw = !!(v2 && v2.mismatch === true && v2.displayed !== v2.seeded && up2 === v2.seeded);
        twDetail = `flagged:${v2 && v2.mismatch} · displayed(lie):${v2 && v2.displayed} ≠ seeded:${v2 && v2.seeded} · final up-face ${up2} ≡ seeded (truth wins)`;
      }
    }
    check('VG8m/forced-mismatch-truth-wins', tw, twDetail);

    // die-fidget-pure: END the turn so it is NOT the viewer's turn; a die touch then does a
    // lazy DEAD ROLL (fidget) — rowHash AND moveCount invariant across it (pure theater).
    await waitDieIdle('VG8m/die-fidget-pure'); // wait out the previous return
    await page.click('#end-btn');
    const preFidget = await hashesM();
    const dieXY3 = await page.evaluate(() => window.__GAME3D__.dieScreenXY());
    let fid = false, fidDetail = 'NO-DIE-XY';
    if (dieXY3) {
      await page.mouse.click(dieXY3.x, dieXY3.y);
      if (await waitDieRest('VG8m/die-fidget-pure')) {
        const postFidget = await hashesM();
        fid = postFidget.h === preFidget.h && postFidget.m === preFidget.m;
        fidDetail = `rowHash+moveCount invariant across the dead-roll fidget: ${fid} (moves ${preFidget.m}→${postFidget.m})`;
      }
    }
    check('VG8m/die-fidget-pure', fid, fidDetail);

    // round-sequence (I-55a): a bar button opens ROUND_PREAMBLE FIRST (its lead-off callout
    // DERIVED from the projected active seat — the K7-v1x D2 law), a click advances to
    // ROUND_CARD, another dismisses. The cards render OPAQUE OVER the veil (the I-70 law).
    const vm = await page.evaluate(() => window.__GAME3D__.viewData());
    await page.click('#round-btn');
    const r0 = await page.evaluate(() => window.__GAME3D__.roundModalState());
    const preambleOk = !!(r0.open === true && r0.stage === 'preamble' && r0.title === '🎲 Who goes first?'
      && r0.callout === `${vm.active} leads off Round ${vm.round}!` && r0.opaque === true && r0.overVeil === true);
    const stgM = await page.locator('#stage canvas').boundingBox();
    await page.mouse.click(stgM.x + stgM.width / 2, stgM.y + stgM.height / 2);
    const r1 = await page.evaluate(() => window.__GAME3D__.roundModalState());
    const roundCardOk = !!(r1.open === true && r1.stage === 'round-card' && /^Round \d+ · /.test(r1.title ?? '') && r1.opaque === true && r1.overVeil === true);
    await page.mouse.click(stgM.x + stgM.width / 2, stgM.y + stgM.height / 2);
    const r2 = await page.evaluate(() => window.__GAME3D__.roundModalState());
    const dismissedOk = r2.open === false;
    check('VG8m/round-sequence', preambleOk && roundCardOk && dismissedOk,
      `preamble:${preambleOk} (${r0.stage}/${JSON.stringify(r0.title)}/callout ${JSON.stringify(r0.callout)}/opaque ${r0.opaque}·over-veil ${r0.overVeil}) → round-card:${roundCardOk} (${r1.stage}/${JSON.stringify(r1.title)}) → dismissed:${dismissedOk}`);
    await screenshot('/tmp/vg-3d-a4.png');
  }
}
