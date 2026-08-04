// VG8s — A6 (I-136): THE v4 WORKING LOOP IN 3D (select → assign → work), kill-first.
// SELF-SEEDING: fresh game3d.html (moe active, crew-moe unassigned, no ventures), so it
// passes in isolation. Drives the REAL doors: the spawn bar button, a CLICK on the crew
// card, a CLICK on the portion slot — every verb is a real move (hash+moves advance).
export const suite = '3d';
export const id = 'VG8s';

export async function run(h) {
  const { page, check, gotoStage, waitRest, hashes } = h;

  await gotoStage('game3d.html');
  await page.evaluate(() => window.__GAME3D__.glideTo('table'));
  await waitRest('VG8s/loop-glide-rest');

  // 1 · spawn-venture through the chrome door → the venture renders ≡ the projection
  // (id/status/portions + slot quads). KILL: unregister the ventures component → match
  // false / no slot XY → fails by name.
  const hm0 = await hashes();
  await page.click('#spawn-btn');
  let ventured = false;
  try {
    await page.waitForFunction(() => { const v = window.__GAME3D__.venturesInfo(); return v.want.length === 1 && v.match; }, null, { timeout: 8000 });
    ventured = true;
  } catch { /* named below */ }
  const vi = await page.evaluate(() => window.__GAME3D__.venturesInfo());
  const hm1 = await hashes();
  check('VG8s/venture-spawns-and-renders', ventured && hm1.m === hm0.m + 1 && hm1.h !== hm0.h,
    `rendered≡projection:${ventured} (${vi.rendered[0] ? `${vi.rendered[0].id}/${vi.rendered[0].status}/${vi.rendered[0].portions}p` : 'NONE'}) · moves ${hm0.m}→${hm1.m} (want +1 — a REAL verb)`);

  // 2 · SELECT: a plain click on the viewer's own crew card lifts it (state + geometry).
  // KILL: cut the click routing → selected stays null → fails (and 3 has no path).
  const cxy = await page.evaluate(() => window.__GAME3D__.seatPlayCardXY('crew:crew-moe'));
  let selected = false;
  if (cxy) {
    const y0 = (await page.evaluate(() => window.__GAME3D__.seatPlayCardPos('crew:crew-moe'))).y;
    await page.mouse.click(cxy.x, cxy.y);
    try { await page.waitForFunction(() => window.__GAME3D__.crewLoopState().selected === 'crew-moe', null, { timeout: 8000 }); selected = true; } catch { /* named below */ }
    const y1 = (await page.evaluate(() => window.__GAME3D__.seatPlayCardPos('crew:crew-moe'))).y;
    const hmSel = await hashes();
    check('VG8s/crew-select-lifts', selected && y1 > y0 + 10 && hmSel.m === hm1.m && hmSel.h === hm1.h,
      `selected:${selected} · lifted:${(y1 - y0).toFixed(0)}u (want >10 — pure theater) · state-invariant:${hmSel.m === hm1.m}`);
  } else {
    check('VG8s/crew-select-lifts', false, 'NO crew-moe CARD XY');
  }

  // 3 · ASSIGN: click portion slot 0 → the card HOPS (motion trace ≥2 frames — never a
  // teleport) → assign-crew submits at arrival → the projection carries assignedTo →
  // the rebuilt card wears '⚒ working'. KILL: cut the assign submit → assignedTo never
  // appears → fails; identity-hop → frames ≤1 → fails.
  const sxy = await page.evaluate((a) => window.__GAME3D__.venturePortionXY(a, 0), vi.rendered[0]?.id ?? 'J1');
  let assigned = false;
  if (sxy && selected) {
    await page.mouse.click(sxy.x, sxy.y);
    try {
      await page.waitForFunction(() => {
        const v = window.__GAME3D__.viewCrew ? window.__GAME3D__.viewCrew() : null;
        return v && v.find((m) => m.id === 'crew-moe' && m.assignedTo);
      }, null, { timeout: 30000 });
      assigned = true;
    } catch { /* named below */ }
  }
  const st3 = await page.evaluate(() => window.__GAME3D__.crewLoopState());
  const hm3 = await hashes();
  const hopReal = !!st3.lastHop && st3.lastHop.frames >= 2 && st3.lastHop.dist > 30;
  check('VG8s/crew-assign-hops-and-binds', assigned && hopReal && hm3.m === hm1.m + 1 && hm3.h !== hm1.h,
    `assignedTo-in-projection:${assigned} · hop:${hopReal ? `${st3.lastHop.frames} frames over ${st3.lastHop.dist.toFixed(0)}u` : 'NONE/SNAP'} · moves ${hm1.m}→${hm3.m} (want +1)`);

  // 4 · WORK: click the (now busy) crew card → the work verb submits → the fresh card
  // BOUNCES (post-state theater). KILL: cut the work branch → moves hold → fails.
  const cxy2 = await page.evaluate(() => window.__GAME3D__.seatPlayCardXY('crew:crew-moe'));
  let bounced = false;
  if (cxy2 && assigned) {
    await page.mouse.click(cxy2.x, cxy2.y);
    try { await page.waitForFunction(() => window.__GAME3D__.crewLoopState().lastBounce !== null, null, { timeout: 8000 }); bounced = true; } catch { /* named below */ }
  }
  const hm4 = await hashes();
  const st4 = await page.evaluate(() => window.__GAME3D__.crewLoopState());
  await page.waitForFunction(() => { const s = window.__GAME3D__.crewLoopState(); return !s.bouncing && !s.hopping; }, null, { timeout: 60000 }).catch(() => {});
  check('VG8s/crew-work-bounces', bounced && (st4.lastBounce?.frames ?? 0) >= 0 && hm4.m === hm3.m + 1 && hm4.h !== hm3.h,
    `work-submitted:${hm4.m === hm3.m + 1} (moves ${hm3.m}→${hm4.m}) · bounce-observed:${bounced}`);

  // 5 · HIRE (A16, I-137): click the tradesperson pile on your turn → the hire verb →
  // crew +1 (the new member from the pool's top), pool −1 (count-true stack), moves +1.
  // KILL: cut the pile click routing → counts hold → fails by name.
  const pc0 = await page.evaluate(() => window.__GAME3D__.poolCounts());
  const crew0 = (await page.evaluate(() => window.__GAME3D__.viewCrew())).filter((m) => m.outfit === 'moe').length;
  const hm5 = await hashes();
  const txy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('tradespeople-pile'));
  let hired = false;
  if (txy) {
    await page.mouse.click(txy.x, txy.y);
    try {
      await page.waitForFunction((want) => window.__GAME3D__.poolCounts().tradespeople === want, pc0.tradespeople - 1, { timeout: 8000 });
      hired = true;
    } catch { /* named below */ }
  }
  const crew1 = (await page.evaluate(() => window.__GAME3D__.viewCrew())).filter((m) => m.outfit === 'moe').length;
  const hm6 = await hashes();
  check('VG8s/pile-click-hires', hired && crew1 === crew0 + 1 && hm6.m === hm5.m + 1 && hm6.h !== hm5.h,
    `pool ${pc0.tradespeople}→${pc0.tradespeople - 1}:${hired} · moe's crew ${crew0}→${crew1} (want +1) · moves ${hm5.m}→${hm6.m} (want +1 — a REAL verb, I-137)`);

  // 6 · BUY (A16, I-137): click the equipment pile → the buy verb → the viewer's assets
  // +1, pool −1, moves +1 — AND the I-93 DEFERRED-until-nonzero trigger FIRES: the first
  // nonzero asset RENDERS in the seat's equipment row (the L-4 plan's row, count-true).
  const a0 = await page.evaluate(() => window.__GAME3D__.assetsCount());
  const exy = await page.evaluate(() => window.__GAME3D__.regionScreenXY('equipment-pile'));
  let bought = false;
  if (exy) {
    await page.mouse.click(exy.x, exy.y);
    try {
      await page.waitForFunction((want) => window.__GAME3D__.assetsCount().got === want, a0.got + 1, { timeout: 8000 });
      bought = true;
    } catch { /* named below */ }
  }
  const a1 = await page.evaluate(() => window.__GAME3D__.assetsCount());
  const pc2 = await page.evaluate(() => window.__GAME3D__.poolCounts());
  const hm7 = await hashes();
  check('VG8s/pile-click-buys', bought && a1.want === a0.want + 1 && a1.got === a1.want && pc2.equipment === pc0.equipment - 1 && hm7.m === hm6.m + 1,
    `assets ${a0.got}→${a1.got} RENDERED ≡ projection ${a1.want} (the I-93 nonzero trigger FIRES) · equipment pool ${pc0.equipment}→${pc2.equipment} · moves ${hm6.m}→${hm7.m} (want +1)`);

  await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
}
