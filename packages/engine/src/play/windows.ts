/**
 * M7 WindowManager — IWN lifecycle: open → block(gated) → decide(decider | auto) →
 * apply → close. The decision is ALWAYS taken and ALWAYS a logged intent.
 * Traces: S3 F2·M7 ← S2 M7 · seam S-8. Axioms: GX-8. Refusals: R-6, R-7. Hook: HK-5.
 */

import type { JsonObject, State } from '../kernel/types.js';
import { EffectEngine, EffectRefusal } from './effects.js';
import type { EffectDescriptor } from './effects.js';

export interface WindowRow extends JsonObject {
  readonly id: string;
  readonly kind: string;
  readonly decider: string;
  readonly options: readonly { readonly label: string; readonly fx: readonly EffectDescriptor[] }[];
  readonly auto: number;
  readonly gated: boolean;
  readonly status: string;
}

export class HookHk5Violation extends Error {
  constructor(detail: string) {
    super(`HK-5 violated: ${detail}`);
    this.name = 'HookHk5Violation';
  }
}

export function openWindows(state: State): readonly WindowRow[] {
  return (state['windows'] as readonly WindowRow[]).filter((w) => w.status === 'open');
}

export function openGatedWindows(state: State): readonly WindowRow[] {
  return openWindows(state).filter((w) => w.gated);
}

/**
 * HK-5 — before seat advance: no open gated window (or auto-resolved) → block.
 * Named + on-path so mutation deletion is caught by GBC-11's refusal assertion's twin
 * in the hooks suite (divergence injection: a lying rule check).
 */
export function hookHk5BeforeSeatAdvance(state: State): void {
  const gated = openGatedWindows(state);
  if (gated.length > 0) {
    throw new HookHk5Violation(
      `seat advance with open gated window(s): ${gated.map((w) => w.id).join(', ')}`
    );
  }
}

function seatEliminated(state: State, seatId: string): boolean {
  const rows = state['seats'] as readonly { id: string; eliminated: boolean }[];
  return rows.find((s) => s.id === seatId)?.eliminated === true;
}

function closeWindow(state: JsonObject, windowId: string): JsonObject {
  const windows = state['windows'] as readonly WindowRow[];
  return {
    ...state,
    windows: windows.map((w) => (w.id === windowId ? { ...w, status: 'closed' } : w)),
  } as JsonObject;
}

/** Decider resolution: apply the chosen option's fx at window depth 1, close. */
export function resolveWindow(
  state: State,
  windowId: string,
  optionIdx: number,
  bySeat: string
): JsonObject {
  const win = openWindows(state).find((w) => w.id === windowId);
  if (!win) throw new EffectRefusal('window', 'GX-8', `no open window "${windowId}"`);
  if (win.decider !== bySeat) {
    throw new EffectRefusal('window', 'GX-8/R-6', `seat "${bySeat}" is not the decider of "${windowId}"`);
  }
  const option = win.options[optionIdx];
  if (!option) throw new EffectRefusal('window', 'GX-8', `option ${optionIdx} does not exist on "${windowId}"`);
  const applied = EffectEngine.applyAll(state, option.fx, { windowDepth: 1 });
  return closeWindow(applied, windowId);
}

/**
 * Auto-policy resolution (GX-8/R-7): LEGAL only when the decider is eliminated/absent.
 * The caller submits this as an intent, so the decision lands in the log — never skipped,
 * never silent.
 */
export function autoResolveWindow(state: State, windowId: string): JsonObject {
  const win = openWindows(state).find((w) => w.id === windowId);
  if (!win) throw new EffectRefusal('window', 'GX-8', `no open window "${windowId}"`);
  if (!seatEliminated(state, win.decider)) {
    throw new EffectRefusal(
      'window',
      'GX-8/R-7',
      `decider "${win.decider}" is present — auto-policy may not usurp a live decider`
    );
  }
  const option = win.options[win.auto] ?? win.options[0];
  if (!option) throw new EffectRefusal('window', 'GX-8', `window "${windowId}" has no options`);
  const applied = EffectEngine.applyAll(state, option.fx, { windowDepth: 1 });
  return closeWindow(applied, windowId);
}
