/**
 * UI TRACE (I-238, owner-ordered: 'set up an event listener so you can track and
 * report on the state of the UI as I interact with it'): a ring buffer of every
 * interaction's RESOLUTION — what was hit, what selected (or WHY NOTHING did), what
 * the wheel decided, every anchor and view transition. The owner plays; the trace
 * remembers; the next 'it does something weird' comes with evidence attached.
 * Read it live: __GAME3D__.uiTrace() — or __GAME3D__.uiTraceText() to copy-paste.
 */
export interface TraceEvent { t: number; kind: string; detail: string }
const BUF: TraceEvent[] = [];
const CAP = 250;
let t0 = 0;

export function trace(kind: string, detail: string): void {
  if (!t0) t0 = performance.now();
  BUF.push({ t: Math.round(performance.now() - t0), kind, detail });
  if (BUF.length > CAP) BUF.shift();
}

export const uiTrace = (): readonly TraceEvent[] => BUF;
export const uiTraceText = (): string => BUF.map((e) => `${(e.t / 1000).toFixed(2)}s ${e.kind}: ${e.detail}`).join('\n');
