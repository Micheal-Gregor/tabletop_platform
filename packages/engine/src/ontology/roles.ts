/**
 * ME2 RoleBinder — every role binds to an existing platform primitive (EX-3).
 * Traces: S3 F3·ME2 ← S2 ME2. Axioms: GX-14. Refusals: R-11. Gate: ODG-e1 (TimeSource
 * DEFERRED — "admit the kind, defer the binding", RD-e5; USE of the binding refuses).
 */

export const ROLES = Object.freeze(['Randomizer', 'Tracker', 'TimeSource', 'Reference'] as const);
export type RoleName = (typeof ROLES)[number];

export class RoleRefusal extends Error {
  constructor(readonly role: string, readonly rule: string, detail: string) {
    super(`Role refused [${rule}] "${role}": ${detail}`);
    this.name = 'RoleRefusal';
  }
}

export type RoleBinding =
  | { readonly status: 'bound'; readonly primitive: string }
  | { readonly status: 'deferred'; readonly gate: 'ODG-e1' };

const BINDINGS: Readonly<Record<RoleName, RoleBinding>> = Object.freeze({
  Randomizer: { status: 'bound', primitive: 'RNGStreams (M4)' },
  Tracker: { status: 'bound', primitive: 'derived state (SC-2 / M1)' },
  Reference: { status: 'bound', primitive: 'ruleset presentation (MR6→MP7 seam)' },
  TimeSource: { status: 'deferred', gate: 'ODG-e1' }, // the Clock seam stays OPEN
});

/** EX-3: binding lookup. Unknown role → R-11 refusal (unbindable = inadmissible). */
export function bindingFor(role: string): RoleBinding {
  const b = BINDINGS[role as RoleName];
  if (!b) {
    throw new RoleRefusal(role, 'GX-14/R-11', 'unknown role — no platform primitive to bind');
  }
  return b;
}

/** USING a deferred binding refuses — admission carried it open; operation may not. */
export function usableBinding(role: string): { readonly primitive: string } {
  const b = bindingFor(role);
  if (b.status === 'deferred') {
    throw new RoleRefusal(role, `GX-14/${b.gate}`, 'binding DEFERRED behind the Clock seam — resolve ODG-e1 first');
  }
  return { primitive: b.primitive };
}
