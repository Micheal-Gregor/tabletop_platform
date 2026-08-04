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

  await page.evaluate(() => window.__GAME3D__.glideTo('overview'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
}
