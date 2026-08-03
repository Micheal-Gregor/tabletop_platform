// VG8n — A10: THE LEDGER (I-74; kill-first). The BOOKS panel as a physical ledger — a
// CLOSED book FLAT in front of the viewing seat; a REAL click FLIPS it open, rendering the
// measured BOOKS_PANEL def (I-56) with REAL balance-sheet fills from the projection. FOUR
// checks: (n1) the OPEN ledger renders BOOKS_PANEL's region ids (DOM-vs-LAW); (n2) the
// balance identity Assets ≡ Liabilities + Equity holds AND matches the INDEPENDENT
// projection oracle (cash + Σ AR · Σ AP) AND the rendered footnote speaks those figures —
// mutate a fill → fails BY NAME (the GD5/GD5b law in 3D, I-56d); (n3) the flip-open STATE
// (closed → open → closed); (n4) the open panel is OPAQUE over the veil (the A3b/I-70
// discipline). Waits on STATE (I-60f); asserts material/geometry/STATE, never pixels (I-57c).
// SELF-SEEDING: navigates a fresh game3d.html (the balance identity is projection-relative,
// so it holds at genesis) so it PASSES in isolation.
export const suite = '3d';
export const id = 'VG8n';

export async function run(h) {
  const { page, check, gotoStage } = h;

  await gotoStage('game3d.html');
  {
    await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const stgL = await page.locator('#stage canvas').boundingBox();
    await page.mouse.move(stgL.x + stgL.width / 2, stgL.y + stgL.height / 2);
    const closed0 = await page.evaluate(() => window.__GAME3D__.ledgerState().open);
    const lxy = await page.evaluate(() => window.__GAME3D__.ledgerScreenXY());
    let opened = false;
    if (lxy) {
      await page.mouse.click(lxy.x, lxy.y); // the REAL open gesture — the closed book flips open
      try { await page.waitForFunction(() => window.__GAME3D__.ledgerState().open === true, null, { timeout: 60000 }); opened = true; }
      catch { opened = false; }
    }
    if (!opened) {
      check('VG8n/ledger-renders-books-panel', false, `ledger never opened (closed0:${closed0} · xy:${JSON.stringify(lxy)})`);
      check('VG8n/ledger-balance-identity', false, 'ledger never opened');
      check('VG8n/ledger-opaque', false, 'ledger never opened');
      check('VG8n/ledger-flip-open-state', false, `ledger never opened (closed0:${closed0})`);
    } else {
      const reg = await page.evaluate(() => window.__GAME3D__.ledgerRegions());
      const wantIds = await page.evaluate(() => window.__GAME3D__.booksPanelIds());
      const bal = await page.evaluate(() => window.__GAME3D__.ledgerBalance());
      const proj = await page.evaluate(() => window.__GAME3D__.ledgerProjection());

      // (n1) ledger-renders-books-panel: the OPEN overlay carries EXACTLY BOOKS_PANEL's ids
      // (title · tabs · body · total · footnote · callout). A wrong def / dropped region fails.
      const idsOk = reg && wantIds.length === 6 && JSON.stringify(reg.ids) === JSON.stringify(wantIds);
      check('VG8n/ledger-renders-books-panel', !!idsOk,
        reg ? `open ids [${reg.ids.join(',')}] vs BOOKS_PANEL law [${wantIds.join(',')}]` : 'ledgerRegions null — ledger not open');

      // (n2) balance identity + projection fidelity + rendered fidelity (GD5/GD5b in 3D). The
      // gate is the ORACLE: it sums the raw projection itself (VG8b pattern) and asserts the
      // stamped figures satisfy the identity, equal the projection, and appear in the footnote.
      const projCash = proj.cash;
      const projAr = proj.ar.reduce((a, b) => a + b, 0);
      const projAp = proj.ap.reduce((a, b) => a + b, 0);
      const wantAssets = projCash + projAr, wantLiab = projAp, wantEquity = wantAssets - wantLiab;
      const identity = !!bal && bal.assets === bal.liabilities + bal.equity;
      const fidelity = !!bal && bal.cash === projCash && bal.ar === projAr && bal.ap === projAp
        && bal.assets === wantAssets && bal.liabilities === wantLiab && bal.equity === wantEquity;
      const wantFoot = `Assets $${wantAssets} = Liabilities $${wantLiab} + Equity $${wantEquity}. The books always balance.`;
      const footOk = !!(reg && reg.regions.footnote && JSON.stringify(reg.regions.footnote.lines) === JSON.stringify([wantFoot]));
      check('VG8n/ledger-balance-identity', identity && fidelity && footOk,
        bal ? `assets ${bal.assets} = liab ${bal.liabilities} + equity ${bal.equity} · identity:${identity} · proj(cash ${projCash} AR ${projAr} AP ${projAp}) fidelity:${fidelity} · footnote-true:${footOk}` : 'ledgerBalance null');

      // (n4) OPAQUE over the veil (I-70): every panel face opacity 1 + transparent-pass +
      // renderOrder above the veil — the three conditions that make the panel COVER the veil.
      check('VG8n/ledger-opaque', !!(reg && reg.opaque && reg.overVeil),
        reg ? `opaque:${reg.opaque} (minOpacity ${reg.minOpacity} · transparent-pass:${reg.transparentPass}) · over-veil:${reg.overVeil} (panel ${reg.panelOrder} > veil ${reg.veilOrder})` : 'ledgerRegions null');

      // (n3) flip-open STATE: closed at rest → open after the click → closed after ANY click
      await page.mouse.click(stgL.x + stgL.width / 2, stgL.y + stgL.height / 2); // any click closes (consumed)
      const closedAfter = await page.evaluate(() => window.__GAME3D__.ledgerState().open);
      check('VG8n/ledger-flip-open-state', closed0 === false && opened === true && closedAfter === false,
        `closed-at-rest:${closed0 === false} · flipped-open:${opened} · closed-after-click:${closedAfter === false}`);
    }
  }
}
