/**
 * Golden-vector scenarios — V-2 (replay byte-equality) and V-3 (EFX dispatch table).
 * COMPUTED from the reference implementation (never hand-written); persisted to
 * V-2.json / V-3.json at the owner-approved R-gate discharge (2026-07-25); re-derived
 * on every suite run by packages/engine/tests/vectors.test.ts. A mismatch is a
 * DIVERGENCE to explain — never a value to update silently.
 */
import {
  EngineCore,
  EffectEngine,
  hashState,
  loadPack,
  packGenesis,
  rebuild,
} from '../packages/engine/src/index.js';
import type { ContentPack, EffectDescriptor, PackRef, Seat, WindowRow } from '../packages/engine/src/index.js';

export const VECTOR_PACK_REF: PackRef = { id: 'vector-pack', version: '1.0.0', hash: 'v3c70r' };
export const VECTOR_SEATS: readonly Seat[] = [{ id: 'A' }, { id: 'B' }];
export const V2_SEED = 'sigma-7'; // the Stage-2b seed name, carried as the vector's seed

export const VECTOR_PACK: ContentPack = {
  id: 'vector-pack',
  version: '1.0.0',
  efxVersion: '1.1.1',
  maxRounds: 2,
  seats: [{ id: 'A' }, { id: 'B' }],
  cards: {
    payday: { fx: [{ fx: 'pay', to: 'A', amount: 3 }] },
    transfer: { fx: [{ fx: 'pay', to: 'B', from: 'A', amount: 1 }] },
    tax: { fx: [{ fx: 'levy', scope: 'table', amount: 1 }] },
    charter: { fx: [{ fx: 'capitalize', owner: 'B', asset: 'ship', amount: 4 }] },
    favor: { fx: [{ fx: 'grant_favor', to: 'B', n: 2 }] },
    seed_card: { fx: [{ fx: 'deck_inject', deck: 'main', card: 'payday', policy: 'bottom' }] },
    writ: { fx: [{ fx: 'grant_sue_right', holder: 'A', against: 'B', window: 'court' }] },
    crossroads: {
      fx: [
        {
          fx: 'open_window',
          kind: 'choice',
          decider: 'A',
          options: [
            { label: 'take gold', fx: [{ fx: 'pay', to: 'A', amount: 2 }] },
            { label: 'take favor', fx: [{ fx: 'grant_favor', to: 'A', n: 1 }] },
          ],
          auto: 1,
        },
      ],
    },
  },
  decks: {
    main: { cards: ['payday', 'transfer', 'tax', 'charter', 'favor', 'seed_card', 'writ', 'crossroads'] },
  },
};

function mustOk(r: unknown, what: string): void {
  if (r && typeof r === 'object' && 'refused' in (r as object)) {
    throw new Error(`vector scenario defect at ${what}: ${JSON.stringify(r)}`);
  }
}

/** V-2: a deterministic full-machinery scenario (draws · window · wrap), replayed twice. */
export function computeV2(): {
  finalHash: string;
  rebuiltHash1: string;
  rebuiltHash2: string;
  moveCount: number;
  row: unknown;
} {
  const { genesis, wire } = loadPack(VECTOR_PACK);
  const core = new EngineCore(VECTOR_PACK_REF, VECTOR_SEATS, V2_SEED, genesis);
  wire(core);

  const resolveOpenWindows = (seatOfRecord: string): void => {
    for (const w of core.getState()['windows'] as readonly WindowRow[]) {
      if (w.status === 'open') {
        mustOk(
          core.submit({ type: 'window:resolve', seat: w.decider, args: { window: w.id, option: 0 } }),
          `resolve ${w.id} (${seatOfRecord})`
        );
      }
    }
  };

  // Round 1: A draws three, resolves anything opened, passes; B draws two, passes (wrap).
  for (let i = 0; i < 3; i++) {
    mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }), `A draw ${i}`);
    resolveOpenWindows('A');
  }
  mustOk(core.submit({ type: 'turn:advance', seat: 'A', args: {} }), 'A advance');
  mustOk(core.submit({ type: 'turn:pass', seat: 'A', args: {} }), 'A pass r1');
  for (let i = 0; i < 2; i++) {
    mustOk(core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'main' } }), `B draw ${i}`);
    resolveOpenWindows('B');
  }
  mustOk(core.submit({ type: 'turn:pass', seat: 'B', args: {} }), 'B pass r1 (wrap)');
  // Round 2: A draws the injected/remaining cards, passes; B passes (end-trigger → closing).
  for (let i = 0; i < 2; i++) {
    mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }), `A draw r2·${i}`);
    resolveOpenWindows('A');
  }
  mustOk(core.submit({ type: 'turn:pass', seat: 'A', args: {} }), 'A pass r2');
  mustOk(core.submit({ type: 'turn:pass', seat: 'B', args: {} }), 'B pass r2');

  const row = core.toRow();
  const r1 = rebuild(row, packGenesis(VECTOR_PACK), (c) => loadPack(VECTOR_PACK).wire(c));
  const r2 = rebuild(row, packGenesis(VECTOR_PACK), (c) => loadPack(VECTOR_PACK).wire(c));
  return {
    finalHash: core.getStateHash(),
    rebuiltHash1: r1.getStateHash(),
    rebuiltHash2: r2.getStateHash(),
    moveCount: row.moves.length,
    row,
  };
}

/** V-3: each EFX descriptor applied in isolation to the genesis state → resulting hash. */
export function computeV3(): Array<{ descriptor: EffectDescriptor; stateHashAfter: string }> {
  const genesisState = packGenesis(VECTOR_PACK)(VECTOR_PACK_REF, VECTOR_SEATS, V2_SEED);
  const table: EffectDescriptor[] = [
    { fx: 'pay', to: 'A', amount: 3 },
    { fx: 'pay', to: 'B', from: 'A', amount: 1 },
    { fx: 'capitalize', owner: 'B', asset: 'ship', amount: 4 },
    { fx: 'grant_favor', to: 'B', n: 2 },
    { fx: 'levy', scope: 'table', amount: 1 },
    { fx: 'levy', scope: 'A', amount: 2 },
    { fx: 'deck_inject', deck: 'main', card: 'payday', policy: 'top' },
    { fx: 'deck_inject', deck: 'main', card: 'tax', policy: 'bottom' },
    { fx: 'grant_sue_right', holder: 'A', against: 'B', window: 'court' },
    { fx: 'open_window', kind: 'choice', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0 },
  ];
  return table.map((descriptor) => ({
    descriptor,
    stateHashAfter: hashState(EffectEngine.apply(genesisState, descriptor, { windowDepth: 0 })),
  }));
}

// ── V-5 / V-6 (discharged at the owner's R gate, 2026-07-25) ──
import { AdmissibilityGate, seededRegistry, composeSurface, placeComponent, retireComposedSurface } from '../packages/engine/src/index.js';
import type { KindDef, State } from '../packages/engine/src/index.js';

/** V-5: the EX-2 admission predicate decides, per kind — the decision table. */
export function computeV5(): Array<{ kind: string; admissible: boolean; defects?: string }> {
  const gate = new AdmissibilityGate(seededRegistry());
  const table: KindDef[] = [
    { name: 'Standee', stateShape: { art: 'string' }, roles: ['Tracker'], relationsGrantable: ['Placement', 'Attachment'] },
    { name: 'Hourglass', stateShape: { sand: 'number' }, roles: ['TimeSource'], relationsGrantable: ['Placement'] },
    { name: 'NoShape', stateShape: undefined as never, roles: [], relationsGrantable: [] },
    { name: 'BadRole', stateShape: {}, roles: ['Chronomancer'], relationsGrantable: [] },
    { name: 'BadRel', stateShape: {}, roles: [], relationsGrantable: ['Teleport'] },
    { name: '', stateShape: {}, roles: [], relationsGrantable: [] },
    { name: 'DualRole', stateShape: { v: 'number' }, roles: ['Randomizer', 'Tracker'], relationsGrantable: ['Placement', 'Representation'] },
  ];
  return table.map((def) => {
    const verdict = gate.decide(def);
    return verdict.admissible
      ? { kind: def.name, admissible: true }
      : { kind: def.name || '<unnamed>', admissible: false, defects: verdict.defects };
  });
}

/** V-6: composed-Surface integrity — the built map IS a Surface (ER-e3), hashed. */
export function computeV6(): { composedHash: string; placedOntoMapHash: string; retiredHash: string } {
  const g = (): State =>
    ({
      seats: [{ id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false }],
      turn: { round: 1, seatIdx: 0, phase: 'start', wrappedRound: 0, maxRounds: 2, status: 'playing' },
      decks: {}, windows: [], windowSeq: 0,
      components: { t1: { kind: 'Tile' }, t2: { kind: 'Tile' }, t3: { kind: 'Tile' }, fig: { kind: 'Figure' } },
      surfaces: { table: { topology: 'grid' } },
      relations: [], relationEvents: [], relationSeq: 0,
    }) as State;
  const composed = composeSurface(g(), 'map1', ['t1', 't2', 't3'], 'grid');
  const placed = placeComponent(composed, 'fig', 'map1', { x: 0, y: 0 });
  return {
    composedHash: hashState(composed),
    placedOntoMapHash: hashState(placed),
    retiredHash: hashState(retireComposedSurface(placed, 'map1')),
  };
}

// ── V-7 / V-8 (discharged at the owner's R gate, 2026-07-25) ──
import { RuleRegistry, formRelation, dissolveRelation, pumpRelationEvents } from '../packages/engine/src/index.js';
import type { RuleContribution, RelationRow } from '../packages/engine/src/index.js';

const V78_VOCABS = { efx: '1.1.1', hooks: '1.0' } as const;

function ontoState(): State {
  return {
    seats: [
      { id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      { id: 'B', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
    ],
    turn: { round: 1, seatIdx: 0, phase: 'start', wrappedRound: 0, maxRounds: 3, status: 'playing' },
    decks: { main: { draw: ['base'], discard: [], reserve: [] } },
    windows: [], windowSeq: 0,
    components: { tok: { kind: 'Token', value: 0 }, card1: { kind: 'Card', faceUp: false } },
    surfaces: { table: { topology: 'grid' } },
    relations: [], relationEvents: [], relationSeq: 0,
  } as State;
}

/** V-7: the precedence law — per-firing snapshot, total order (hook, bearer-entry-seq). */
export function computeV7(): { deckOrder: readonly string[]; finalHash: string } {
  const registry = new RuleRegistry();
  const mk = (id: string, card: string): RuleContribution => ({
    id, bearer: { kind: 'Card' }, trigger: 'on-card-drawn', condition: { op: 'always' },
    effects: [{ fx: 'deck_inject', deck: 'main', card, policy: 'top' }],
    declaredSlots: [{ name: 'fired', reset: 'never' }],
    slotWrites: [{ slot: 'fired', increment: 1 }],
    vocabVersions: V78_VOCABS,
  });
  registry.register(mk('first', 'X'));
  registry.register(mk('second', 'Y'));
  registry.register(mk('third', 'Z'));
  const out = registry.dispatch(ontoState(), 'on-card-drawn', { hook: 'on-card-drawn' }, { windowDepth: 0 });
  return {
    deckOrder: (out['decks'] as Record<string, { draw: readonly string[] }>)['main']!.draw,
    finalHash: hashState(out),
  };
}

/** V-8: the monster room — a relation-borne contribution registers on FORM, dies on dissolve. */
export function computeV8(): { afterFormHash: string; afterDissolveHash: string; monsterFired: unknown } {
  const registry = new RuleRegistry();
  registry.register({
    id: 'monster', bearer: { relationType: 'Attachment' }, trigger: 'on-form:Attachment',
    condition: { op: 'always' },
    effects: [{ fx: 'levy', scope: 'table', amount: 2 }],
    declaredSlots: [{ name: 'fired', reset: 'never' }],
    slotWrites: [{ slot: 'fired', increment: 1 }],
    vocabVersions: V78_VOCABS,
  });
  let s = formRelation(ontoState(), { type: 'Attachment', from: 'tok', to: 'card1' });
  s = pumpRelationEvents(s, registry, { windowDepth: 0 }) as State;
  const afterFormHash = hashState(s);
  const monsterFired = ((s['ruleSlots'] as Record<string, Record<string, unknown>>)['monster'] ?? {})['fired'];
  const relId = (s['relations'] as readonly RelationRow[])[0]!.id;
  s = dissolveRelation(s, relId) as State;
  s = pumpRelationEvents(s, registry, { windowDepth: 0 }) as State; // inert — derived activation
  return { afterFormHash, afterDissolveHash: hashState(s), monsterFired };
}

// ── V-1: THE MINIMAL micro-game (σ=7, two seats, three cards, Stage-2b S0..S10) ──
import { RuleRegistry } from '../packages/engine/src/index.js';
import { MIN_REF as V1_REF, MIN_SEATS as V1_SEATS, minimalGenesis, wireMinimal } from '../packages/engine/tests/f5-fixture.js';

/**
 * V-1: the Stage-2b script + the ranking law, end-to-end through every facet F1-F5.
 * The rule, stated independently of the vector (SP-5): A ends at 0, B at +3, B is
 * champion; every ledger entry balanced; cash ≡ derived balances; rebuild ×2 byte-identical.
 * SINGLE SOURCE: the same fixture GBC-40 exercises — never a re-implementation.
 */
export function computeV1(): {
  finalHash: string;
  rebuiltHash1: string;
  rebuiltHash2: string;
  champion: string;
  ranking: readonly { seat: string; cash: number }[];
  moveCount: number;
  row: unknown;
} {
  const registry = new RuleRegistry();
  const core = new EngineCore(V1_REF, V1_SEATS, 'sigma-7', minimalGenesis);
  wireMinimal(registry)(core);

  // Round 1 · A: wages → draw K2 → spawn V2 → routing window → route to B w/ debt
  mustOk(core.submit({ type: 'upkeep', seat: 'A', args: { overhead: 1 } }), 'A upkeep r1');
  mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } }), 'A draw r1');
  mustOk(
    core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V2', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [{ to: 'B', amount: 3 }] } },
    }),
    'A spawn V2'
  );
  const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.kind === 'routing' && w.status === 'open');
  if (!win) throw new Error('vector scenario defect: routing window did not open');
  mustOk(core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } }), 'A resolve routing');
  mustOk(
    core.submit({ type: 'venture:route', seat: 'A', args: { venture: 'V2', to: 'B', debts: [{ debtor: 'A', creditor: 'B', amount: 2, due: 2 }] } }),
    'A route V2'
  );
  mustOk(core.submit({ type: 'turn:end', seat: 'A', args: {} }), 'A end r1');
  // Round 1 · B: wages → draw K3 → attach TFX → crew works V2 → wrap (TFX ticks, expires)
  mustOk(core.submit({ type: 'upkeep', seat: 'B', args: { overhead: 1 } }), 'B upkeep r1');
  mustOk(core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'B' } }), 'B draw r1');
  mustOk(core.submit({ type: 'tfx:attach', seat: 'B', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 1, source: 'K3' } } }), 'B tfx');
  mustOk(core.submit({ type: 'crew:assign', seat: 'B', args: { crew: 'crew-B', venture: 'V2', portion: 0 } }), 'B assign');
  mustOk(core.submit({ type: 'crew:work', seat: 'B', args: { crew: 'crew-B' } }), 'B work');
  mustOk(core.submit({ type: 'turn:end', seat: 'B', args: {} }), 'B end r1 (wrap)');
  // Round 2 · A: upkeep settles the debt → draw K1 → degenerate J1 → work → complete
  mustOk(core.submit({ type: 'upkeep', seat: 'A', args: {} }), 'A upkeep r2');
  mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } }), 'A draw r2');
  mustOk(
    core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'J1', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'A', amount: 4 }] } },
    }),
    'A spawn J1'
  );
  mustOk(core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'J1', portion: 0 } }), 'A assign');
  mustOk(core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } }), 'A work');
  mustOk(core.submit({ type: 'turn:end', seat: 'A', args: {} }), 'A end r2');
  // Round 2 · B: upkeep → empty draw (legal, S8) → wrap → 'closing' → the Reckoning
  mustOk(core.submit({ type: 'upkeep', seat: 'B', args: {} }), 'B upkeep r2');
  mustOk(core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'B' } }), 'B empty draw r2');
  mustOk(core.submit({ type: 'turn:end', seat: 'B', args: {} }), 'B end r2 (closing)');
  mustOk(core.submit({ type: 'closing:reckon', seat: 'A', args: {} }), 'reckon');

  const results = core.getState()['results'] as { champion: string; ranking: readonly { seat: string; cash: number }[] };
  const row = core.toRow();
  const wireForRebuild = (c: EngineCore) => wireMinimal(new RuleRegistry())(c);
  const r1 = rebuild(row, minimalGenesis, wireForRebuild);
  const r2 = rebuild(row, minimalGenesis, wireForRebuild);
  return {
    finalHash: core.getStateHash(),
    rebuiltHash1: r1.getStateHash(),
    rebuiltHash2: r2.getStateHash(),
    champion: results.champion,
    ranking: results.ranking,
    moveCount: row.moves.length,
    row,
  };
}

// ── V-4: pattern-preset fidelity — THE FULL CATALOG SWEEP (I-44; discharged at the
// owner's R gate 5). The rule, independent of the pin (SP-5/VK-8): each preset's built
// fragment, exercised THROUGH THE ENGINE, reproduces its inventory-documented behavior.
import {
  CATALOG,
  CLOSING_DEFAULTS,
  IWN_KINDS,
  buildCivic,
  buildExpansion,
  buildGlobal,
  buildIncident,
  buildJob,
  buildModifier,
  buildProject,
  buildRouted,
  buildRouting,
  buildWindow,
} from '@tabletop/patterns';
import { EffectEngine as V4Fx } from '../packages/engine/src/index.js';
import type { State as V4State } from '../packages/engine/src/index.js';
import { newMinimalCore, minimalGenesis as v4Genesis, MIN_REF as V4_REF } from '../packages/engine/tests/f5-fixture.js';

export function computeV4(): Record<string, unknown> {
  const table: Record<string, unknown> = {};

  // VNT sweep: spawn each preset through the engine; record the observable lifecycle facts.
  const vntSpecs = {
    'vnt:job': buildJob({ id: 'J', initiator: 'A', task: 'α', amount: 4, deadline: 2 }),
    'vnt:project': buildProject({ id: 'P', initiator: 'A', deadline: 2, phases: [{ task: 'α', work: 1, party: 'A' }, { task: 'α', work: 1, party: 'A' }], amount: 6 }),
    'vnt:civic': buildCivic({ id: 'C', initiator: 'A', deadline: 2, seatIds: ['A', 'B'], task: 'α', amountPerSeat: 2 }),
    'vnt:routed': buildRouted({ id: 'R', initiator: 'A', deadline: 2, tasks: ['α', 'β', 'γ'], amount: 6 }),
    'vnt:incident': buildIncident({ id: 'I', initiator: 'A', deadline: 1, task: 'α', amount: 1 }),
    'vnt:expansion': buildExpansion({ id: 'X', initiator: 'A', deadline: 2, task: 'α', work: 3, amount: 9 }),
  } as const;
  for (const [key, spec] of Object.entries(vntSpecs)) {
    const { core } = newMinimalCore(`v4-${key}`);
    const res = core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: spec as never } });
    if ('refused' in res) throw new Error(`V-4 sweep defect at ${key}: ${JSON.stringify(res)}`);
    const s = core.getState();
    const windows = (s['windows'] as readonly { kind: string; status: string; gated: boolean }[]).filter((w) => w.status === 'open');
    table[key] = {
      portions: spec.portions.length,
      unassigned: spec.portions.filter((p) => p.party === undefined).length,
      payoffTargets: spec.payoffs.map((p) => p.to),
      routingWindowOpened: windows.some((w) => w.kind === 'routing' && w.gated),
      hash: core.getStateHash(),
    };
  }
  // the job preset's FULL RC-A′ lifecycle (the degenerate form, end to end):
  {
    const { core } = newMinimalCore('v4-job-life');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: vntSpecs['vnt:job'] as never } });
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'J', portion: 0 } });
    core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } });
    const s = core.getState();
    table['vnt:job:lifecycle'] = {
      status: (s['ventures'] as readonly { status: string }[])[0]!.status,
      receivable: (s['receivables'] as readonly { holder: string; amount: number }[])[0],
      hash: core.getStateHash(),
    };
  }

  // RTM sweep: the three model fragments verbatim + subcontract-debt driven through the engine.
  table['rtm:subcontract-debt'] = buildRouting('subcontract-debt', { venture: 'V', from: 'A', to: 'B', amount: 2, due: 2 });
  table['rtm:commission-now'] = buildRouting('commission-now', { venture: 'V', from: 'A', to: 'B', amount: 1 });
  table['rtm:deferred-referral'] = buildRouting('deferred-referral', { venture: 'V', from: 'A', to: 'B' });
  {
    const { core } = newMinimalCore('v4-rtm');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const win = (core.getState()['windows'] as readonly { id: string; status: string }[]).find((w) => w.status === 'open')!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    const frag = buildRouting('subcontract-debt', { venture: 'V', from: 'A', to: 'B', amount: 2, due: 2 });
    core.submit({ type: 'venture:route', seat: 'A', args: frag.routeArgs as never });
    table['rtm:subcontract-debt:engine'] = { debts: core.getState()['debts'], hash: core.getStateHash() };
  }

  // IWN sweep: all nine kinds opened through EffectEngine on the MINIMAL genesis.
  for (const kind of IWN_KINDS) {
    const frag = buildWindow(kind, { decider: 'A' });
    const s = V4Fx.apply(v4Genesis(V4_REF, [], `v4-iwn-${kind}`) as V4State, frag as never, { windowDepth: 0 }) as V4State;
    const win = (s['windows'] as readonly { kind: string; gated: boolean; status: string; options: readonly unknown[] }[])[0]!;
    table[`iwn:${kind}`] = { kind: win.kind, gated: win.gated, status: win.status, options: win.options.length };
  }

  // TFX sweep: both scopes ticked at the wrap through the weave.
  {
    const { core } = newMinimalCore('v4-tfx-global');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: buildGlobal({ id: 'G', charge: 1, rounds: 1, source: 'GLB' }) as never } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} });
    const seats = core.getState()['seats'] as readonly { id: string; cash: number }[];
    table['tfx:global'] = { cash: seats.map((s) => [s.id, s.cash]), expired: (core.getState()['timedEffects'] as unknown[]).length === 0, hash: core.getStateHash() };
  }
  {
    const { core } = newMinimalCore('v4-tfx-mod');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: buildModifier({ id: 'M', outfit: 'B', charge: 1, rounds: 1, source: 'MOD' }) as never } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} });
    const seats = core.getState()['seats'] as readonly { id: string; cash: number }[];
    table['tfx:modifier'] = { cash: seats.map((s) => [s.id, s.cash]), hash: core.getStateHash() };
  }

  table['closing:defaults'] = CLOSING_DEFAULTS;
  table['catalog:families'] = Object.values(CATALOG).reduce<Record<string, number>>((acc, e) => {
    acc[e.family] = (acc[e.family] ?? 0) + 1;
    return acc;
  }, {});
  return table;
}

// ── V-9: the die-tile-page scene (EP-2 theater-sync; discharged at the owner's R gate 6).
// The rule, independent of the pin (SP-5): displayed result ≡ seeded result across kinds
// and joins; the rendered scene is byte-deterministic across rebuilds. Single-sourced on
// the same presentation functions + MINIMAL fixture GBC-54 exercises.
import {
  a11yAudit,
  beginFlourish,
  bindPlaceholder,
  completeFlourish,
  KIND_CONTRACTS,
  project,
  renderComponent,
  renderJoin,
  renderTable,
} from '@tabletop/presentation';
import { RNGStreams as V9Streams } from '../packages/engine/src/index.js';

export function computeV9(): {
  dieResult: string;
  syncMismatch: unknown;
  tileSvg: string;
  pageSvg: string;
  rebuiltPageSvg: string;
  a11yMissing: number;
} {
  const seeded = String(new V9Streams('sigma-7').stream('die:table').nextInt(6) + 1);
  const verdict = completeFlourish(beginFlourish('die-throw', seeded, '♪ die throw'), seeded);
  const bound = bindPlaceholder([...KIND_CONTRACTS['Die']!, ...KIND_CONTRACTS['Surface']!, ...KIND_CONTRACTS['Card']!]);
  const tileSvg = renderJoin('Placement', 'die placed on the table', renderComponent('Die', { id: 'd6', label: `die showing ${verdict.result}`, value: verdict.result }, bound));

  const registry = new RuleRegistry();
  const core = new EngineCore(V1_REF, V1_SEATS, 'sigma-7', minimalGenesis);
  wireMinimal(registry)(core);
  mustOk(core.submit({ type: 'upkeep', seat: 'A', args: { overhead: 1 } }), 'V9 upkeep');
  mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } }), 'V9 draw');
  const pageSvg = renderTable(project(core.getState(), 'A'), bound);

  const row = core.toRow();
  const rebuilt = rebuild(row, minimalGenesis, (c) => wireMinimal(new RuleRegistry())(c));
  const rebuiltPageSvg = renderTable(project(rebuilt.getState(), 'A'), bound);

  return {
    dieResult: verdict.result,
    syncMismatch: verdict.mismatch,
    tileSvg,
    pageSvg,
    rebuiltPageSvg,
    a11yMissing: a11yAudit(pageSvg + tileSvg),
  };
}
