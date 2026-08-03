// VG8m — A4 (I-73; kill-first): THE ROUND-CARD SEQUENCE + a SEEDED ROLLING EXHIBIT die.
// Reload game3d for a clean genesis (moe active = the VIEWING seat). The die is an EXHIBIT
// — the slice has NO engine die verb — so it touches NO game state: rowHash AND moveCount
// are invariant through every roll and fidget. Assert geometry/verdict STATE, never pixels
// (I-57c); WAIT ON diePhase STATE, never clocks (I-60f). Already SELF-SEEDING (its own
// clean genesis nav), so it PASSES in isolation.
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

    // die-face-count: exactly SIX pip faces, values 1..6 (a standard die).
    const faces = await page.evaluate(() => window.__GAME3D__.dieFaces());
    check('VG8m/die-face-count', JSON.stringify(faces) === JSON.stringify([1, 2, 3, 4, 5, 6]),
      `die faces [${(faces ?? []).join(',')}] (want 1..6)`);

    // die-roll-hk11: on the VIEWER'S turn (moe) a REAL click on the die rolls the SEEDED
    // toss; at settle the DISPLAYED up-face EQUALS the seeded result (HK-11, no mismatch),
    // and the die touched NO game state (rowHash + moveCount invariant — the EXHIBIT law).
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
