// VG8n — A10, P-2c LEDGER: THE THREE-OBJECTS LAW (I-86; supersedes I-84/I-85's VG8n; kill-
// first). The folder and its TWO PERSISTENT SHEET OBJECTS: closed, the sheets live INSIDE
// the folder (right edges peeking past the SHORTER front flap); a REAL click UNFOLDS the
// flap LEFT to lie flat, and only then the SAME sheet objects deploy to display (P&L LEFT,
// Balance RIGHT). ANCHOR-PER-REPORT is sealed law; the sheet-objects check makes the
// owner's "three objects, not a faked animation" challenge falsifiable:
//   (two-page-risen) opening yields TWO focusable pages, LEFT = P&L < RIGHT = Balance, and
//                    both stand ABOVE the folder (the RISE — page centre y > folder top + 50).
//   (renders)        CARRIED VERBATIM from K-C — each page renders REAL stamped rows; Balance
//                    = the projection identity + independent oracle + footnote; P&L = the
//                    honest bracketed placeholder (nothing invented).
//   (anchor-balance) THE DEFECT KILL: a REAL click on the Balance page anchors it and zooms
//                    to ITS reading view — focus 'ledger-balance', read mode, all 8 bbox
//                    corners inside NDC.
//   (anchor-switch)  the full owner loop: REAL wheel-out (the ladder, read → scene) then a
//                    REAL click on the P&L page → reads 'ledger-pnl', corners in NDC.
//   (opaque)         CARRIED — pages opacity 1, opaque pass (I-70).
//   (flip-open-state) closed → open (cover settles OPEN ≥0.999) → a NON-PAGE click closes
//                    (cover settles CLOSED), leaving read mode.
// Waits on STATE (I-60f); asserts material/geometry/STATE, never pixels (I-57c). SELF-SEEDING:
// navigates a fresh game3d.html (the balance identity is projection-relative, holds at genesis).
export const suite = '3d';
export const id = 'VG8n';

export async function run(h) {
  const { page, check, gotoStage } = h;
  const G = (fn, ...a) => page.evaluate(fn, ...a);
  const NAMES = ['ledger-two-page-risen', 'ledger-renders', 'ledger-anchor-balance', 'ledger-anchor-switch', 'ledger-opaque', 'ledger-flip-open-state', 'ledger-sheet-objects'];

  await gotoStage('game3d.html');

  await G(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const stg = await page.locator('#stage canvas').boundingBox();
  await page.mouse.move(stg.x + stg.width / 2, stg.y + stg.height / 2);

  const closed0 = await G(() => window.__GAME3D__.ledgerState().open);
  const cover0 = await G(() => window.__GAME3D__.ledgerCoverOpen());
  // P-2c (I-86) closed-form reads: the two PERSISTENT sheet objects live INSIDE the folder
  // (parent 'folder'), their right edges peeking past the SHORTER front flap.
  const ids0 = await G(() => window.__GAME3D__.ledgerSheetIds());
  const form0 = await G(() => window.__GAME3D__.ledgerFolderForm());
  const lxy = await G(() => window.__GAME3D__.ledgerScreenXY());
  let opened = false;
  if (lxy) {
    await page.mouse.click(lxy.x, lxy.y); // the REAL open gesture — the folder flips open
    try { await page.waitForFunction(() => window.__GAME3D__.ledgerState().open === true, null, { timeout: 60000 }); opened = true; }
    catch { opened = false; }
  }
  // wait on the RISE + COVER animation STATE to settle (never a clock) before geometry reads
  let settled = false;
  if (opened) {
    try {
      await page.waitForFunction(() => window.__GAME3D__.ledgerSettled() === true && window.__GAME3D__.ledgerCoverOpen() >= 0.999, null, { timeout: 60000 });
      settled = true;
    } catch { settled = false; }
  }

  if (!opened || !settled) {
    const why = !opened ? `ledger never opened (closed0:${closed0} · xy:${JSON.stringify(lxy)})` : 'rise/cover animation never settled';
    for (const n of NAMES) check(`VG8n/${n}`, false, why);
    return;
  }

  const pages = await G(() => window.__GAME3D__.ledgerPages());
  const folderY = await G(() => window.__GAME3D__.ledgerFolderY());
  const wantIds = await G(() => window.__GAME3D__.booksPanelIds());
  const pnl = await G(() => window.__GAME3D__.ledgerPageContent('pnl'));
  const bal = await G(() => window.__GAME3D__.ledgerPageContent('balance'));
  const balance = await G(() => window.__GAME3D__.ledgerBalance());
  const proj = await G(() => window.__GAME3D__.ledgerProjection());

  // (two-page-risen) TWO focusable pages; LEFT = P&L < RIGHT = Balance; both RISEN — the
  // page centres stand ABOVE the folder top (the "reports rise up into their position" law).
  const pPnl = pages.find((p) => p.kind === 'pnl');
  const pBal = pages.find((p) => p.kind === 'balance');
  const risen = pPnl && pBal && typeof folderY === 'number' && pPnl.worldY > folderY + 50 && pBal.worldY > folderY + 50;
  // PORTRAIT (P-2b/I-85): report-sized sheets — each standing page's bbox is taller than wide.
  const portrait = await G(() => {
    const out = {};
    for (const k of ['pnl', 'balance']) {
      const o = window.__GAME3D__.ledgerPageBBox(k);
      out[k] = o ? o.h > o.w : null;
    }
    return out;
  });
  const portraitOk = portrait.pnl === true && portrait.balance === true;
  const twoPage = pages.length === 2 && pPnl && pBal && pPnl.focusable && pBal.focusable
    && pPnl.id === 'ledger-pnl' && pBal.id === 'ledger-balance' && pPnl.worldX < pBal.worldX && risen && portraitOk;
  check('VG8n/ledger-two-page-risen', !!twoPage,
    `pages=${pages.length} · pnl(x=${pPnl?.worldX?.toFixed?.(0)},y=${pPnl?.worldY?.toFixed?.(0)}, focusable=${pPnl?.focusable}) < balance(x=${pBal?.worldX?.toFixed?.(0)},y=${pBal?.worldY?.toFixed?.(0)}, focusable=${pBal?.focusable}) · risen-above-folder(top ${typeof folderY === 'number' ? folderY.toFixed(0) : 'null'}+50):${!!risen} · portrait(report-sized):${JSON.stringify(portrait)}`);

  // G-D (I-166, the owner: 'actually upright instead of off at an angle'): each risen
  // sheet stands VERTICAL (lean ≈ 0°) and faces along the seat frame's yaw (heading
  // error ≈ 0°) — aligned to the player board, 90° about y. KILL: restore any tilt or
  // drop the settle-snap → the numbers name it.
  const upr = await page.evaluate(() => window.__GAME3D__.ledgerUpright());
  // K7-V M-1: (a) EXACT-POSE — posErr/quatErr ≡ 0 (a deleted settle-snap leaves ~3e-6
  // and fails; the lean pin alone could not see it); (b) the heading is checked against
  // an INDEPENDENT yaw source (seatYawData(0)), closing the spreadYaw self-reference.
  const indYaw = await page.evaluate(() => window.__GAME3D__.seatYawData()[0]);
  const wantHead = (indYaw * 180) / Math.PI;
  const headsOk = !!upr && ['pnl', 'balance'].every((k) => {
    const d = Math.abs(((upr[k].heading - wantHead + 540) % 360) - 180);
    return d < 2;
  });
  const uprOk = !!upr && ['pnl', 'balance'].every((k) => upr[k] && Math.abs(upr[k].lean) < 2 && Math.abs(upr[k].headingErr) < 2
    && upr[k].posErr === 0 && upr[k].quatErr === 0) && headsOk;
  check('VG8n/ledger-upright', uprOk,
    upr ? `pnl lean ${upr.pnl?.lean?.toFixed(2)}° head ${upr.pnl?.heading?.toFixed(1)}° pos ${upr.pnl?.posErr} quat ${upr.pnl?.quatErr} · balance lean ${upr.balance?.lean?.toFixed(2)}° pos ${upr.balance?.posErr} · independent-yaw ${wantHead.toFixed(1)}°:${headsOk} (want lean<2° · pose EXACT ≡0 · heading ≡ seat-0's own yaw — G-D/I-166 + K7-V M-1)` : 'NO-UPRIGHT-ORACLE (spread not displayed?)');

  // (renders) — CARRIED VERBATIM from K-C (I-79): both pages carry EXACTLY BOOKS_PANEL's 6
  // region ids with NON-BLANK stamped rows; Balance = identity + fidelity + footnote; P&L =
  // the honest bracketed placeholder with NO invented $-figure.
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

  const pnlRows = pnl ? [...(pnl.body ?? []), ...(pnl.total ?? [])] : [];
  const pnlPlaceholder = pnlRows.length > 0 && pnlRows.every((s) => String(s).includes('[—]'));
  const pnlNoFigures = pnl ? !Object.values(pnl).flat().some((s) => /\$\s*\d/.test(String(s))) : false;

  check('VG8n/ledger-renders', bothRender && identity && fidelity && balFootOk && pnlPlaceholder && pnlNoFigures,
    `both-non-blank:${bothRender} · balance{identity:${identity} fidelity:${fidelity} foot:${balFootOk}} (assets ${balance?.assets}=liab ${balance?.liabilities}+eq ${balance?.equity}; proj cash ${proj.cash} AR ${projAr} AP ${projAp}) · pnl{placeholder:${pnlPlaceholder} no-invented-figures:${pnlNoFigures}}`);

  // (opaque) each page opacity 1 + opaque pass — not see-through (I-70 equivalent)
  const op = await G(() => window.__GAME3D__.ledgerOpaque());
  check('VG8n/ledger-opaque', !!(op && op.opaque),
    op ? `opaque:${op.opaque} (minOpacity ${op.minOpacity} · opaque-pass:${op.opaquePass})` : 'ledgerOpaque null — not open');

  // (anchor-balance) THE DEFECT KILL — the owner's exact loop: a REAL click ON the Balance
  // page → it anchors and zooms to ITS reading view. focus 'ledger-balance', read mode, all
  // 8 bbox corners inside NDC (fit-to-frame carried into the anchor law).
  const bxy = await G(() => window.__GAME3D__.ledgerPageScreenXY('balance'));
  let anchorBalOk = false, anchorBalDetail = 'NO-BALANCE-XY';
  if (bxy) {
    await page.mouse.click(bxy.x, bxy.y);
    await page.waitForFunction(() => window.__GAME3D__.readState().focus === 'ledger-balance' && window.__GAME3D__.readState().mode === 'read', null, { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const rsB = await G(() => window.__GAME3D__.readState());
    const cornersB = await G(() => window.__GAME3D__.cornersNdc());
    const inFrameB = Array.isArray(cornersB) && cornersB.length === 8 && cornersB.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
    anchorBalOk = rsB.mode === 'read' && rsB.focus === 'ledger-balance' && inFrameB;
    anchorBalDetail = `after the REAL balance-page click: focus ${rsB.focus} (mode ${rsB.mode}) · corners-in-NDC:${inFrameB}`;
  }
  check('VG8n/ledger-anchor-balance', anchorBalOk, anchorBalDetail);

  // (anchor-switch) the full loop back: REAL wheel-out (the ladder leaves read to the
  // anchor's scene view), then a REAL click on the P&L page → reads 'ledger-pnl'.
  let outMode = null;
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 300); // the REAL zoom-out gesture
    try { await page.waitForFunction(() => window.__GAME3D__.readState().mode !== 'read', null, { timeout: 4000 }); break; }
    catch { /* another notch */ }
  }
  outMode = await G(() => window.__GAME3D__.readState().mode);
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  const pxy = await G(() => window.__GAME3D__.ledgerPageScreenXY('pnl'));
  let switchOk = false, switchDetail = `wheel-out mode:${outMode} · NO-PNL-XY`;
  if (pxy) {
    await page.mouse.click(pxy.x, pxy.y);
    await page.waitForFunction(() => window.__GAME3D__.readState().focus === 'ledger-pnl' && window.__GAME3D__.readState().mode === 'read', null, { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
    const rsP = await G(() => window.__GAME3D__.readState());
    const cornersP = await G(() => window.__GAME3D__.cornersNdc());
    const inFrameP = Array.isArray(cornersP) && cornersP.length === 8 && cornersP.every((c) => Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1);
    switchOk = outMode !== 'read' && rsP.mode === 'read' && rsP.focus === 'ledger-pnl' && inFrameP;
    switchDetail = `wheel-out mode:${outMode} → REAL pnl-page click → focus ${rsP.focus} (mode ${rsP.mode}) · corners-in-NDC:${inFrameP}`;
  }
  check('VG8n/ledger-anchor-switch', switchOk, switchDetail);

  // (flip-open-state) the CLOSED FORM + the TWO-STAGE transform (P-2c/I-86): at genesis the
  // folder is shut (fold 0), the front flap is NARROWER than the back with the sheets' right
  // edges PEEKING past it, and both sheets are folder children; opening FOLDS the flap LEFT
  // flat FIRST (open form: the flap lies LEFT of the back) and only THEN deploys the sheets
  // (spread-start-cover ≥ 0.999 — the recorded handoff); a NON-PAGE click closes: the sheets
  // RETURN into the folder and only then the fold shuts (gated), leaving read mode.
  const idsOpen = await G(() => window.__GAME3D__.ledgerSheetIds()); // while displayed: parent 'scene'
  const formOpen = await G(() => window.__GAME3D__.ledgerFolderForm()); // the flap swung LEFT
  const startCover = await G(() => window.__GAME3D__.ledgerSpreadStartCover()); // the stage-2 handoff record
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  await page.mouse.click(stg.x + 24, stg.y + 24); // a corner click — NOT a page — closes
  let closedAfter = false, coverClosed = false;
  try {
    await page.waitForFunction(() => window.__GAME3D__.ledgerState().open === false && window.__GAME3D__.ledgerSheetsHome() === true && window.__GAME3D__.ledgerCoverOpen() <= 0.01, null, { timeout: 60000 });
    closedAfter = true; coverClosed = true;
  } catch {
    closedAfter = (await G(() => window.__GAME3D__.ledgerState().open)) === false;
    coverClosed = (await G(() => window.__GAME3D__.ledgerCoverOpen())) <= 0.01;
  }
  const idsEnd = await G(() => window.__GAME3D__.ledgerSheetIds()); // closed again: parent 'folder'
  const modeEnd = await G(() => window.__GAME3D__.readState().mode);
  const closedForm = !!form0 && form0.frontW < form0.backW - 10 && form0.sheetPeekX > 5
    && ids0.length === 2 && ids0.every((s) => s.parent === 'folder');
  const swungLeft = !!formOpen && formOpen.frontOffsetX < -100;
  const sequenced = typeof startCover === 'number' && startCover >= 0.999;
  check('VG8n/ledger-flip-open-state',
    closed0 === false && cover0 === 0 && opened === true && closedAfter && coverClosed && modeEnd !== 'read' && closedForm && swungLeft && sequenced,
    `closed-at-rest:${closed0 === false} (fold0 ${cover0}) · closed-form{flap-narrower:${!!form0 && form0.frontW < form0.backW - 10} (front ${form0?.frontW?.toFixed?.(0)} < back ${form0?.backW?.toFixed?.(0)}−10) · sheets-peek-right:${!!form0 && form0.sheetPeekX > 5} (peek ${form0?.sheetPeekX?.toFixed?.(1)}) · both-inside:${ids0.every((s) => s.parent === 'folder')}} · flipped-open:${opened} · flap-swung-LEFT:${swungLeft} (offset ${formOpen?.frontOffsetX?.toFixed?.(0)}) · fold-then-deploy sequenced (${startCover}):${sequenced} · closed-after-non-page-click:${closedAfter} · fold-shut-after-sheets-home:${coverClosed} · left-read:${modeEnd !== 'read'} (mode ${modeEnd})`);

  // (sheet-objects) THE THREE-OBJECTS LAW (P-2c/I-86 — the owner's challenge made
  // falsifiable): the SAME two sheet objects walk the whole cycle — identical UUIDs closed →
  // displayed → closed-again, parentage folder → scene → folder. A faked animation (pages
  // rebuilt or swapped at open, the I-85 mechanism) CANNOT pass: its uuids change.
  const uuidStable = ['pnl', 'balance'].every((k) => {
    const a = ids0.find((s) => s.kind === k), b = idsOpen.find((s) => s.kind === k), c = idsEnd.find((s) => s.kind === k);
    return a && b && c && a.uuid === b.uuid && b.uuid === c.uuid;
  });
  const parentWalk = ids0.every((s) => s.parent === 'folder') && idsOpen.every((s) => s.parent === 'scene') && idsEnd.every((s) => s.parent === 'folder');
  check('VG8n/ledger-sheet-objects', uuidStable && parentWalk && ids0.length === 2 && idsOpen.length === 2 && idsEnd.length === 2,
    `uuids-stable-across-cycle:${uuidStable} · parentage folder→scene→folder:${parentWalk} (closed ${ids0.map((s) => s.parent).join('/')} · open ${idsOpen.map((s) => s.parent).join('/')} · end ${idsEnd.map((s) => s.parent).join('/')})`);
}
