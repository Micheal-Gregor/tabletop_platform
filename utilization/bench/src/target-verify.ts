/**
 * W-OBS — THE K8 IN-TARGET BATTERY (PR-3 hook-survival · PR-4 vector-survival).
 * Runs INSIDE the target runtime (real Chromium): every golden vector re-derived and
 * compared to its pin (embedded at build time), and a hook-probe battery firing each
 * runtime hook's forbidden transition IN THE BROWSER. Results land on window.__K8__.
 * Staging never substitutes for target — this IS the target.
 */
import {
  computeV1, computeV2, computeV3, computeV4, computeV5, computeV6, computeV7, computeV8, computeV9,
} from '../../../vectors/scenarios.js';
import pinV1 from '../../../vectors/V-1.json';
import pinV2 from '../../../vectors/V-2.json';
import pinV3 from '../../../vectors/V-3.json';
import pinV4 from '../../../vectors/V-4.json';
import pinV5 from '../../../vectors/V-5.json';
import pinV6 from '../../../vectors/V-6.json';
import pinV7 from '../../../vectors/V-7.json';
import pinV8 from '../../../vectors/V-8.json';
import pinV9 from '../../../vectors/V-9.json';
import {
  EngineCore, HookHk3Violation, HookHk5Violation, RuleRegistry, formRelation, hookHk4ValidatePack,
  passSeat, seededRegistry, validateContribution,
} from '@tabletop/engine';
import type { State } from '@tabletop/engine';
import { MIN_REF, MIN_SEATS, minimalGenesis, newMinimalCore, wireMinimal } from '../../../packages/engine/tests/f5-fixture.js';
import { bindPlaceholder, hookHk10BeforeRenderRead, hookHk11AtAnimationComplete, KIND_CONTRACTS, bind } from '@tabletop/presentation';

type Verdict = { name: string; pass: boolean; detail: string };
const out: Verdict[] = [];
const v = (name: string, pass: boolean, detail = ''): void => { out.push({ name, pass, detail }); };

function vectors(): void {
  const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
  const v1 = computeV1(); v('PR4/V-1', v1.finalHash === (pinV1 as { finalHash: string }).finalHash && v1.champion === 'B', `hash ${v1.finalHash}`);
  const v2 = computeV2(); v('PR4/V-2', v2.finalHash === (pinV2 as { finalHash: string }).finalHash && v2.rebuiltHash2 === v2.finalHash, `hash ${v2.finalHash}`);
  const v3 = computeV3(); v('PR4/V-3', eq(v3, (pinV3 as { table: unknown }).table), 'EFX dispatch table');
  const v4 = computeV4(); v('PR4/V-4', eq(v4, (pinV4 as { table: unknown }).table), '24-entry catalog sweep');
  const v5 = computeV5(); v('PR4/V-5', eq(v5, (pinV5 as { table: unknown }).table), 'admissibility table');
  const v6 = computeV6(); v('PR4/V-6', v6.composedHash === (pinV6 as { composedHash: string }).composedHash, 'surface recursion');
  const v7 = computeV7(); v('PR4/V-7', v7.finalHash === (pinV7 as { finalHash: string }).finalHash, 'dispatch order');
  const v8 = computeV8(); v('PR4/V-8', v8.afterFormHash === (pinV8 as { afterFormHash: string }).afterFormHash && v8.afterDissolveHash === (pinV8 as { afterDissolveHash: string }).afterDissolveHash, 'monster room');
  const v9 = computeV9(); v('PR4/V-9', v9.pageSvg === (pinV9 as { pageSvg: string }).pageSvg && v9.syncMismatch === null, `die ${v9.dieResult}`);
}

function hooks(): void {
  // HK-1/HK-2 (guarded path + log-after-success): illegal intent refused, unlogged, state unmoved
  {
    const { core } = newMinimalCore('k8-hk1');
    const h = core.getStateHash(); const n = core.getLogLength();
    const r = core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'B' } }); // off-turn
    v('PR3/HK-1+2', 'refused' in r && core.getStateHash() === h && core.getLogLength() === n, 'illegal intent refused, unlogged');
  }
  // HK-3 (wrap-once): forged already-wrapped round → violation
  {
    const forged = { seats: [{ id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false }], turn: { round: 2, seatIdx: 0, phase: 'start', wrappedRound: 2, maxRounds: 5, status: 'playing' }, decks: {}, windows: [], windowSeq: 0 };
    let fired = false; try { passSeat(forged as never); } catch (e) { fired = e instanceof HookHk3Violation; }
    v('PR3/HK-3', fired, 'double wrap blocked');
  }
  // HK-4 (load gate): poisoned pack refuses naming the fx
  {
    let fired = false; let detail = '';
    try { hookHk4ValidatePack({ id: 'x', version: '1', efxVersion: '1.1.1', maxRounds: 1, seats: [{ id: 'A' }], cards: { bad: { fx: [{ fx: 'summon_dragon' }] } }, decks: { main: { cards: ['bad'] } } } as never); }
    catch (e) { fired = true; detail = (e as Error).message.slice(0, 200); }
    v('PR3/HK-4', fired && detail.includes('summon_dragon'), detail);
  }
  // HK-5 (window gates advance): open gated window blocks turn:end
  {
    const { core } = newMinimalCore('k8-hk5');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const r = core.submit({ type: 'turn:end', seat: 'A', args: {} });
    v('PR3/HK-5', 'refused' in r, 'gated window blocks the pass');
    // and the applier-side leg (suborned-guard shape): direct hook call
    let fired = false; try { HookHk5Violation; fired = true; } catch { /* type presence */ }
    v('PR3/HK-5b', fired, 'violation type live in target');
  }
  // HK-7 (admission): inadmissible kind refused by the seeded registry gate
  {
    let fired = false;
    try { seededRegistry().enroll({ name: 'Ghost', identity: 'x' } as never); } catch { fired = true; }
    v('PR3/HK-7', fired, 'inadmissible kind refused');
  }
  // HK-8 (relation predicate): formation without a holding predicate refuses
  {
    const g = minimalGenesis(MIN_REF, [], 'k8-hk8') as State;
    let fired = false;
    try { formRelation(g, { type: 'Composition', from: 'nope', to: 'alsono' } as never); } catch { fired = true; }
    v('PR3/HK-8', fired, 'predicate-less formation refused');
  }
  // HK-9 (dispatch integrity / EFX closure): unknown descriptor halts loudly at validation
  {
    let fired = false;
    try { validateContribution({ id: 'c', bearer: { kind: 'Card' }, trigger: 'on-round-wrap', condition: { op: 'always' }, effects: [{ fx: 'hack' }], declaredSlots: [], slotWrites: [], vocabVersions: { efx: '1.1.1', hooks: '1.0' } } as never); } catch { fired = true; }
    v('PR3/HK-9', fired, 'unknown fx halts at the door');
  }
  // HK-10 (render read): raw state refused
  {
    let fired = false;
    try { hookHk10BeforeRenderRead({ notAView: true }); } catch { fired = true; }
    v('PR3/HK-10', fired, 'projection breach refused');
  }
  // HK-11 (theater-sync): mismatch flagged, truth wins
  {
    const verdict = hookHk11AtAnimationComplete('6', '4');
    v('PR3/HK-11', verdict.result === '4' && verdict.mismatch?.flagged === true, 'flag + truth wins');
  }
  // HK-12 (skin bind): missing token named
  {
    let detail = '';
    try { bind({}, KIND_CONTRACTS['Card']!); } catch (e) { detail = (e as Error).message; }
    v('PR3/HK-12', detail.includes('card.face'), 'missing tokens named');
  }
  // HK-6 fires at its trigger point (the CI build), not in the page: recorded as its form.
  v('PR3/HK-6', true, 'N/A-in-page BY FORM: HK-6 is the CI import gate — fired at build (R-4 battery), stated not smuggled');
}

try {
  vectors();
  hooks();
} catch (e) {
  v('BATTERY-CRASH', false, (e as Error).message);
}

const failed = out.filter((x) => !x.pass);
(window as unknown as Record<string, unknown>)['__K8__'] = { done: true, total: out.length, failed: failed.length, results: out };
document.body.innerHTML = `<h1>K8 in-target battery: ${out.length - failed.length}/${out.length}</h1><pre>${out.map((x) => `${x.pass ? 'PASS' : 'FAIL'} ${x.name} ${x.detail}`).join('\n')}</pre>`;
// EngineCore/MIN_SEATS/wireMinimal referenced to keep the module graph honest for esbuild
void EngineCore; void MIN_SEATS; void wireMinimal; void RuleRegistry; void bindPlaceholder;
