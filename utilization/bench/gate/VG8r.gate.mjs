// VG8r — R-1a (I-109; kill-first): THE DIE GOES RAPIER. The physics program's first
// object and its FIRST LAW: physics ANIMATES, it never decides — the toss is one real
// recorded simulation, replayed with the reconcile offset composed on, so the die
// settles SHOWING THE SEEDED FACE by construction (never corrected after the fact).
// STATE/geometry, never pixels (I-57c); waits on diePhase STATE, never clocks (I-60f).
// SELF-SEEDING (fresh genesis: moe active; the die at its dice-region home).
export const suite = '3d';
export const id = 'VG8r';

export async function run(h) {
  const { page, check, gotoStage, hashes } = h;
  const G = (fn, ...a) => page.evaluate(fn, ...a);

  await gotoStage('game3d.html');
  await G(() => window.__GAME3D__.glideTo('table'));
  await page.waitForFunction(() => !window.__GAME3D__.gliding(), null, { timeout: 60000 }).catch(() => {});
  // physics init is async wasm — wait on READINESS as state (ms in practice)
  await page.waitForFunction(() => window.__GAME3D__.dieSimTrace !== undefined, null, { timeout: 8000 }).catch(() => {});

  const rollOnce = async () => {
    const xy = await G(() => window.__GAME3D__.dieScreenXY());
    if (!xy) return false;
    await page.mouse.click(xy.x, xy.y);
    try { await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'rolling', null, { timeout: 8000 }); } catch { return false; }
    await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'idle', null, { timeout: 120000 }).catch(() => {});
    return true;
  };

  // 1 · physics-sim-real: the roll's theater is a REPLAY OF A REAL SIMULATION — the trace
  // exists with real content. Kill: restore the scripted slerp tumble → no trace → false.
  {
    const rolled = await rollOnce();
    const tr = await G(() => window.__GAME3D__.dieSimTrace());
    const traceOk = !!tr && tr.steps > 5 && tr.frames > 5 && tr.settleFace >= 1 && tr.settleFace <= 6;
    check('VG8r/physics-sim-real', rolled && traceOk,
      `rolled:${rolled} · trace{steps:${tr?.steps} frames:${tr?.frames} settleFace:${tr?.settleFace}} — one real simulation, recorded then replayed`);
  }

  // 2 · reconcile-not-decide — THE R-1 LAW CHECK: find a roll whose SIM settled on a face
  // ≠ the seeded one (the I-109 tuning: roll 0 already diverges; ≤6 tries), then assert
  // the DISPLAYED face ≡ seeded AND the verdict carries NO mismatch — the reconcile
  // happened BEFORE the first frame, not as a correction. Kill: drop the offset → the
  // displayed face = the sim's → completeFlourish flags a REAL mismatch → false.
  {
    let tr = await G(() => window.__GAME3D__.dieSimTrace());
    let vd = await G(() => window.__GAME3D__.dieVerdict());
    let tries = 0;
    while ((!tr || !tr.offsetApplied) && tries < 6) {
      await rollOnce();
      tr = await G(() => window.__GAME3D__.dieSimTrace());
      vd = await G(() => window.__GAME3D__.dieVerdict());
      tries++;
    }
    const up = await G(() => window.__GAME3D__.dieUpFace());
    const lawOk = !!tr && tr.offsetApplied && !!vd && up === vd.seeded && vd.mismatch === false && tr.settleFace !== vd.seeded;
    check('VG8r/reconcile-not-decide', lawOk,
      `sim settled ${tr?.settleFace} ≠ seeded ${vd?.seeded} · displayed ${up} ≡ seeded:${up === vd?.seeded} · mismatch:${vd?.mismatch} (want false — reconciled by construction, never corrected) — PHYSICS NEVER DECIDES`);
  }

  // 3 · die-grab-flick-tumbles: a REAL drag + fast release on the die → the LIVE sim
  // ('rolling-live') observed → settles CONTAINED within the table → returns home (Δ<10)
  // · rowHash/moveCount INVARIANT (pure fidget theater). Kill: drop the flick wiring →
  // 'rolling-live' never observed → false.
  {
    const hm0 = await hashes();
    const xy = await G(() => window.__GAME3D__.dieScreenXY());
    await page.mouse.move(xy.x, xy.y);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) await page.mouse.move(xy.x + i * 22, xy.y - i * 8);
    await page.mouse.up();
    let liveSeen = false;
    try { await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'rolling-live', null, { timeout: 8000 }); liveSeen = true; } catch { /* named below */ }
    await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'idle', null, { timeout: 120000 }).catch(() => {});
    const rest = await G(() => window.__GAME3D__.dieRestInfo());
    const home = await G(() => window.__GAME3D__.dieHome());
    const rect = await G(() => window.__GAME3D__.dieTableRect());
    const homeOk = !!rest && !!home && Math.hypot(rest.x - home.x, rest.z - home.z) < 10;
    const contained = !!rest && !!rect && rest.x > rect.minX && rest.x < rect.maxX && rest.z > rect.minZ && rest.z < rect.maxZ;
    const hm1 = await hashes();
    check('VG8r/die-grab-flick-tumbles', liveSeen && homeOk && contained && hm1.m === hm0.m && hm1.h === hm0.h,
      `rolling-live:${liveSeen} · back-home:${homeOk} · contained:${contained} (the rails law) · state-invariant:${hm1.m === hm0.m && hm1.h === hm0.h} — real physics, pure theater`);
  }

  // 3b · die-hard-flick-contained (R-1a2, I-110 — the owner's escape: "if I flick too
  // hard it flied right off the board... put a cap"): a VIOLENT drag → the capped flick
  // keeps the whole flight ON the felt (the trace never escapes) and the die comes home.
  // Kill: drop the FLICK_CAP → the escape reproduces → trace.escaped → false.
  {
    const xy = await G(() => window.__GAME3D__.dieScreenXY());
    await page.mouse.move(xy.x, xy.y);
    await page.mouse.down();
    for (let i = 1; i <= 3; i++) await page.mouse.move(xy.x + i * 200, xy.y - i * 60);
    await page.mouse.up();
    await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'idle', null, { timeout: 120000 }).catch(() => {});
    const tr = await G(() => window.__GAME3D__.dieFlightTrace());
    const rest = await G(() => window.__GAME3D__.dieRestInfo());
    const home = await G(() => window.__GAME3D__.dieHome());
    const homeOk = !!rest && !!home && Math.hypot(rest.x - home.x, rest.z - home.z) < 10;
    check('VG8r/die-hard-flick-contained', !!tr && tr.escaped === false && homeOk,
      `flight escaped:${tr?.escaped} (want false — the cap + the rails hold) · maxAbs ${tr?.maxAbsX?.toFixed?.(3)}/${tr?.maxAbsZ?.toFixed?.(3)} m · home:${homeOk} — flick as hard as you like`);
  }

  // 4 · die-grab-click-falls-through: a PLAIN CLICK on the die (a claimed grab whose
  // release moved <6 units) still ROLLS — the fall-through protects every VG8m drive.
  // Kill: consume the motionless release → the click never reaches onPick → no roll.
  {
    const xy = await G(() => window.__GAME3D__.dieScreenXY());
    await page.mouse.click(xy.x, xy.y);
    let rolled = false;
    try { await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'rolling', null, { timeout: 8000 }); rolled = true; } catch { /* named below */ }
    await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'idle', null, { timeout: 120000 }).catch(() => {});
    check('VG8r/die-grab-click-falls-through', rolled,
      `plain-click-rolled:${rolled} — the grab claim yields the motionless click to onPick (the VG8m drives live)`);
  }

  // 5 · die-grab-abort-settles: pointercancel mid-drag (touch's constant) → the claim
  // releases and the die comes home. Kill: drop the die's onGrabAbort → the session
  // strands and the die never returns.
  {
    const xy = await G(() => window.__GAME3D__.dieScreenXY());
    await G(({ x, y }) => {
      const el = document.querySelector('#stage canvas');
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 91, clientX: x, clientY: y, bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 91, clientX: x + 60, clientY: y - 25, bubbles: true }));
    }, xy);
    const held = await G(() => ({ claims: window.__GAME3D__.grabClaims(), phase: window.__GAME3D__.diePhase() }));
    await G(() => {
      const el = document.querySelector('#stage canvas');
      el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 91, bubbles: true }));
    });
    const released = await G(() => window.__GAME3D__.grabClaims());
    await page.waitForFunction(() => window.__GAME3D__.diePhase() === 'idle', null, { timeout: 60000 }).catch(() => {});
    const rest = await G(() => window.__GAME3D__.dieRestInfo());
    const home = await G(() => window.__GAME3D__.dieHome());
    const homeOk = !!rest && !!home && Math.hypot(rest.x - home.x, rest.z - home.z) < 10;
    check('VG8r/die-grab-abort-settles',
      held.claims === 1 && held.phase === 'dragging' && released === 0 && homeOk,
      `held:${held.claims}@${held.phase} → cancel → claims:${released} (want 0) · die home:${homeOk} — the die survives touch cancels`);
  }
}
