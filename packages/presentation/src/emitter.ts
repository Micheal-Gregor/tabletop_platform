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
  'decide': (seat, a) => ({ type: 'window:resolve', seat, args: { window: a['window'], option: a['option'] } }),
  'end-turn': (seat) => ({ type: 'turn:end', seat, args: {} }),
  'reckon': (seat) => ({ type: 'closing:reckon', seat, args: {} }),
});

export const VERB_NAMES: readonly string[] = Object.freeze(Object.keys(VERBS));

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
    typeof (out as EmittedIntent).args !== 'object' || (out as EmittedIntent).args === null ||
    typeof (out as { then?: unknown }).then === 'function' || typeof out === 'function' ||
    Object.values(out as Record<string, unknown>).some((v) => typeof v === 'function')
  ) {
    throw new EmissionRefusal(`verb "${verb}" produced a non-intent — presentation emits intents, nothing else`);
  }
  return out as EmittedIntent;
}
