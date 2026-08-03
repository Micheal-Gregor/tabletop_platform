// VG8n — A10, K-C: THE TWO-PAGE LEDGER (I-79; SUPERSEDES the batch-1 single-panel VG8n of
// I-74; kill-first). The BOOKS panel as a physical ledger — a CLOSED book FLAT in front of
// the viewing seat; a REAL click FLIPS it open into a TWO-PAGE SPREAD (P&L on the LEFT page,
// Balance Sheet on the RIGHT). These are the OWNER-BEHAVIOR checks that would have CAUGHT the
// batch-1 failure (books won't render / stuck zoomed):
//   (two-page)   opening yields TWO focusable pages; LEFT = P&L, RIGHT = Balance (world-x
//                left < right).
//   (renders)    each page renders REAL stamped rows (non-blank — the "fails to render" fix);
//                Balance = the projection identity (Assets ≡ Liabilities + Equity + the
//                independent cash+ΣAR−ΣAP oracle + the footnote); P&L = the honest placeholder
//                (bracketed "[—]", nothing invented).
//   (fit-frame)  entering read mode, the selected page's bbox corners are INSIDE NDC (the
//                "stuck zoomed" fix — not cropped / over-zoomed).
//   (switch)     in read mode, a LEFT/RIGHT pan gesture moves the read focus from the P&L
//                page to the Balance page (the read focus CHANGES to the other page).
//   (opaque)     each page is OPAQUE (opacity 1, opaque pass) — not see-through (I-70).
//   (open-state) closed → open → closed (the flip STATE).
// Waits on STATE (I-60f); asserts material/geometry/STATE, never pixels (I-57c). SELF-SEEDING:
// navigates a fresh game3d.html (the balance identity is projection-relative, holds at genesis).
export const suite = '3d';
export const id = 'VG8n';

export async function run(h) {
  const { page, check, gotoStage } = h;
  const G = (fn, ...a) => page.evaluate(fn, ...a);

  await gotoStage('game3d.html');

  await G(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const stg = await page.locator('#stage canvas').boundingBox();
  await page.mouse.move(stg.x + stg.width / 2, stg.y + stg.height / 2);

  const closed0 = await G(() => window.__GAME3D__.ledgerState().open);
  const lxy = await G(() => window.__GAME3D__.ledgerScreenXY());
  let opened = false;
  if (lxy) {
    await page.mouse.click(lxy.x, lxy.y); // the REAL open gesture — the closed book flips open
    try { await page.waitForFunction(() => window.__GAME3D__.ledgerState().open === true, null, { timeout: 60000 }); opened = true; }
    catch { opened = false; }
  }
  // wait on the OPEN animation STATE to settle (not a clock) before reading geometry
  let settled = false;
  if (opened) {
    try { await page.waitForFunction(() => window.__GAME3D__.ledgerSettled() === true, null, { timeout: 60000 }); settled = true; }
    catch { settled = false; }
  }

  if (!opened || !settled) {
    const why = !opened ? `ledger never opened (closed0:${closed0} · xy:${JSON.stringify(lxy)})` : 'open animation never settled';
    for (const n of ['ledger-two-page', 'ledger-renders', 'ledger-fit-to-frame', 'ledger-switch', 'ledger-opaque', 'ledger-flip-open-state'])
      check(`VG8n/${n}`, false, why);
    return;
  }

  const pages = await G(() => window.__GAME3D__.ledgerPages());
  const wantIds = await G(() => window.__GAME3D__.booksPanelIds());
  const pnl = await G(() => window.__GAME3D__.ledgerPageContent('pnl'));
  const bal = await G(() => window.__GAME3D__.ledgerPageContent('balance'));
  const balance = await G(() => window.__GAME3D__.ledgerBalance());
  const proj = await G(() => window.__GAME3D__.ledgerProjection());

  // (two-page) TWO focusable pages; LEFT = P&L, RIGHT = Balance (left world-x < right world-x)
  const pPnl = pages.find((p) => p.kind === 'pnl');
  const pBal = pages.find((p) => p.kind === 'balance');
  const twoPage = pages.length === 2 && pPnl && pBal && pPnl.focusable && pBal.focusable
    && pPnl.id === 'ledger-pnl' && pBal.id === 'ledger-balance' && pPnl.worldX < pBal.worldX;
  check('VG8n/ledger-two-page', !!twoPage,
    `pages=${pages.length} · pnl(x=${pPnl?.worldX}, focusable=${pPnl?.focusable}) < balance(x=${pBal?.worldX}, focusable=${pBal?.focusable}) → left<right:${pPnl && pBal ? pPnl.worldX < pBal.worldX : 'n/a'}`);

  // (renders) — both pages carry EXACTLY BOOKS_PANEL's 6 region ids, each with NON-BLANK
  // stamped rows (the "won't render" fix). Then: Balance = the projection identity + the
  // independent oracle + the footnote; P&L = the honest bracketed placeholder (nothing invented).
  const nonBlank = (rows) => rows && wantIds.every((rid) => Array.isArray(rows[rid]) && rows[rid].length > 0 && rows[rid].every((s) => String(s).trim().length > 0));
  const bothRender = wantIds.length === 6 && nonBlank(pnl) && nonBlank(bal);

  const projAr = proj.ar.reduce((a, b) => a + b, 0);
  const projAp = proj.ap.reduce((a, b) => a + b, 0);
  const wantAssets = proj.cash + projAr, wantLiab = projAp, wantEquity = wantAssets - wantLiab;
  const identity = !!balance && balance.assets === balance.liabilities + balance.equity;
  const fidelity = !!balance && balance.cash === proj.cash && balance.ar === projAr && balance.ap === projAp
    && balance.assets === wantAssets && balance.liabilities === wantLiab && balance.equity === wantEquity;
  const wantFoot = `Assets $${wantAssets} = Liabilities $${wantLiab} + Equity $${wantEquity}. The books always balance.`;
  const balFootOk = !!(bal && bal.footnote && JSON.stringify(bal.footnote) === JSON.stringify([wantFoot]));

  // P&L page = honest placeholder: every body row + the total read a bracketed "[—]", and NO
  // dollar figure is invented on the P&L (no "$<digit>" anywhere in its stamped rows).
  const pnlRows = pnl ? [...(pnl.body ?? []), ...(pnl.total ?? [])] : [];
  const pnlPlaceholder = pnlRows.length > 0 && pnlRows.every((s) => String(s).includes('[—]'));
  const pnlNoFigures = pnl ? !Object.values(pnl).flat().some((s) => /\$\s*\d/.test(String(s))) : false;

  check('VG8n/ledger-renders', bothRender && identity && fidelity && balFootOk && pnlPlaceholder && pnlNoFigures,
    `both-non-blank:${bothRender} · balance{identity:${identity} fidelity:${fidelity} foot:${balFootOk}} (assets ${balance?.assets}=liab ${balance?.liabilities}+eq ${balance?.equity}; proj cash ${proj.cash} AR ${projAr} AP ${projAp}) · pnl{placeholder:${pnlPlaceholder} no-invented-figures:${pnlNoFigures}}`);

  // (opaque) each page opacity 1 + opaque pass — not see-through (I-70 equivalent)
  const op = await G(() => window.__GAME3D__.ledgerOpaque());
  check('VG8n/ledger-opaque', !!(op && op.opaque),
    op ? `opaque:${op.opaque} (minOpacity ${op.minOpacity} · opaque-pass:${op.opaquePass})` : 'ledgerOpaque null — not open');

  // (fit-to-frame) enter READ of the selected (P&L) page; ALL bbox corners inside NDC — the
  // "stuck zoomed" fix (not cropped / over-zoomed). Waits on the glide to settle.
  await G(() => window.__GAME3D__.ledgerReadSelected());
  await page.waitForFunction(() => window.__GAME3D__.readState().focus === 'ledger-pnl', null, { timeout: 60000 }).catch(() => {});
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const rsPnl = await G(() => window.__GAME3D__.readState());
  const corners = await G(() => window.__GAME3D__.cornersNdc());
  const inFrame = Array.isArray(corners) && corners.length === 8 && corners.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
  check('VG8n/ledger-fit-to-frame', rsPnl.mode === 'read' && rsPnl.focus === 'ledger-pnl' && inFrame,
    `read focus:${rsPnl.focus} (mode ${rsPnl.mode}) · corners-in-NDC:${inFrame} ${corners ? '(' + corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ') + ')' : 'null'}`);

  // (switch) in read mode, a LEFT/RIGHT pan gesture switches the read focus to the OTHER
  // page. Pan toward one side; if the read focus did not move (that side has no neighbour),
  // pan the other way — one direction has the Balance page. The tick glides the switch.
  const focusBefore = rsPnl.focus;
  let switched = false;
  await G(() => window.__GAME3D__.panProbe(900, 0));
  try { await page.waitForFunction(() => window.__GAME3D__.readState().focus === 'ledger-balance', null, { timeout: 8000 }); switched = true; }
  catch {
    await G(() => window.__GAME3D__.panProbe(-1800, 0));
    try { await page.waitForFunction(() => window.__GAME3D__.readState().focus === 'ledger-balance', null, { timeout: 8000 }); switched = true; }
    catch { switched = false; }
  }
  const focusAfter = await G(() => window.__GAME3D__.readState().focus);
  check('VG8n/ledger-switch', switched && focusBefore === 'ledger-pnl' && focusAfter === 'ledger-balance',
    `read focus ${focusBefore} → ${focusAfter} (switched:${switched})`);

  // (flip-open-state) closed at rest → open after the open click → closed after ANY click
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  await page.mouse.click(stg.x + stg.width / 2, stg.y + stg.height / 2); // any click closes (consumed)
  const closedAfter = await G(() => window.__GAME3D__.ledgerState().open);
  check('VG8n/ledger-flip-open-state', closed0 === false && opened === true && closedAfter === false,
    `closed-at-rest:${closed0 === false} · flipped-open:${opened} · closed-after-click:${closedAfter === false}`);
}
