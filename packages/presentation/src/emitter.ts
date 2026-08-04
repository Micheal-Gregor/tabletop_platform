/**
 * MP3 IntentEmitter / VerbHandler — presentation emits INTENTS, nothing else (S-6).
 * Traces: S3 F6 · R-23. Axiom GX-37: the verb map is CLOSED; emission is pure data
 * {type, seat, args}; anything else refuses. No state, no engine call, no side channel.
 */
export class EmissionRefusal extends Error {
  constructor(detail: string) {
    super(`Emission refused [GX-37/R-23]: ${detail}`);
    this.name = 'EmissionRefusal';
  }
}

export interface EmittedIntent {
  readonly type: string;
  readonly seat: string;
  readonly args: Readonly<Record<string, unknown>>;
}

type VerbFactory = (seat: string, args: Readonly<Record<string, unknown>>) => EmittedIntent;

/** The CLOSED verb map — presentation's entire vocabulary of action. */
const VERBS: Readonly<Record<string, VerbFactory>> = Object.freeze({
  'upkeep': (seat, a) => ({ type: 'upkeep', seat, args: a }),
  'draw': (seat, a) => ({ type: 'deck:draw', seat, args: { deck: a['deck'] } }),
  'spawn-venture': (seat, a) => ({ type: 'venture:spawn', seat, args: { spec: a['spec'] } }),
  'route-venture': (seat, a) => ({ type: 'venture:route', seat, args: { venture: a['venture'], to: a['to'], debts: a['debts'] ?? [] } }),
  'assign-crew': (seat, a) => ({ type: 'crew:assign', seat, args: { crew: a['crew'], venture: a['venture'], portion: a['portion'] } }),
  'work': (seat, a) => ({ type: 'crew:work', seat, args: { crew: a['crew'] } }),
  'attach-effect': (seat, a) => ({ type: 'tfx:attach', seat, args: { tfx: a['tfx'] } }),
  // A16 (I-137, admission on the record): the pools' doors — module-native intents.
  'hire': (seat) => ({ type: 'crew:hire', seat, args: {} }),
  'buy-equipment': (seat) => ({ type: 'outfit:buy', seat, args: {} }),
  'pool-draw': (seat, a) => ({ type: 'pool:draw', seat, args: { pool: a['pool'] } }), // O-3 (I-139)
  'decide': (seat, a) => ({ type: 'window:resolve', seat, args: { window: a['window'], option: a['option'] } }),
  'end-turn': (seat) => ({ type: 'turn:end', seat, args: {} }),
  'reckon': (seat) => ({ type: 'closing:reckon', seat, args: {} }),
});

/** Emit — R-23's door: the output is validated to be an INTENT and only an intent. */
export function emit(verb: string, seat: string, args: Readonly<Record<string, unknown>> = {}): EmittedIntent {
  const factory = Object.hasOwn(VERBS, verb) ? VERBS[verb] : undefined;
  if (!factory) throw new EmissionRefusal(`unknown verb "${verb}" — the map is closed`);
  if (typeof seat !== 'string' || seat.length === 0) throw new EmissionRefusal('seat required');
  const out = factory(seat, args) as unknown;
  // R-23: presentation emitting anything but an intent → refused (shape-checked at the door)
  if (
    typeof out !== 'object' || out === null ||
    typeof (out as EmittedIntent).type !== 'string' ||
    typeof (out as EmittedIntent).seat !== 'string' ||
    typeof (out as EmittedIntent).args !== 'object' || (out as EmittedIntent).args === null
  ) {
    throw new EmissionRefusal(`verb "${verb}" produced a non-intent — presentation emits intents, nothing else`);
  }
  // K7-F6 D1 (DF6-1): the door is DEEP — the emission must be PURE DATA at every depth.
  // A nested function, thenable, symbol, or any non-cloneable smuggled through args must
  // refuse HERE, typed, never detonate untyped at the seam. The clone also severs
  // aliasing: the caller's args object can never tamper the emitted intent post-hoc.
  try {
    return structuredClone(out) as EmittedIntent;
  } catch {
    throw new EmissionRefusal(`verb "${verb}" produced a non-data emission (function/thenable/uncloneable inside) — presentation emits pure-data intents, nothing else`);
  }
}
