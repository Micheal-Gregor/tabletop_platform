/** K7-F3 round-1 closures — defects 3..8 regression + falsifiability tests. */
import { describe, expect, it } from 'vitest';
import {
  DivergenceError,
  RelationRefusal,
  SurfaceRefusal,
  addSurface,
  composeSurface,
  dissolveRelation,
  formRelation,
  placeComponent,
  readThroughRepresentation,
  rebuild,
  retireComposedSurface,
  wireOntology,
  wirePack,
} from '../src/index.js';
import type { JsonObject, RelationRow, State } from '../src/index.js';
import { ontoGenesis, newOntoCore } from './f3-fixture.js';
import { F2_PACK } from './f2-fixture.js';

const genesis = (): State => ontoGenesis({ id: 'x', version: '0', hash: '0' }, [], 'seed');

describe('D3 · Representation grounded in the state tree (kills P3/P4)', () => {
  it('forming FROM a nonexistent component refuses', () => {
    expect(() =>
      formRelation(genesis(), { type: 'Representation', from: 'ghost', to: 'derived', sourcePath: 'turn.round', mode: 'read-only' })
    ).toThrow(/unknown component/);
  });

  it('a prototype-chain sourcePath ("constructor") refuses at formation — own properties only', () => {
    expect(() =>
      formRelation(genesis(), { type: 'Representation', from: 'tok', to: 'derived', sourcePath: 'constructor', mode: 'read-only' })
    ).toThrow(/does not resolve inside the state tree/);
  });

  it('a read whose path stops resolving refuses rather than leaking', () => {
    let s = formRelation(genesis(), { type: 'Representation', from: 'tok', to: 'derived', sourcePath: 'turn.round', mode: 'read-only' });
    const id = (s['relations'] as readonly RelationRow[])[0]!.id;
    expect(readThroughRepresentation(s, id)).toBe(1);
    // forge a state where the path is gone
    const { turn: _turn, ...rest } = s as Record<string, unknown>;
    expect(() => readThroughRepresentation(rest as never, id)).toThrow(/no longer resolves/);
  });
});

describe('D4 · ontology intents are turn-disciplined (I-24; kills P6)', () => {
  it('seat B cannot mutate ontology on A\'s turn — typed refusal, unlogged', () => {
    const core = newOntoCore();
    const r = core.submit({ type: 'relation:form', seat: 'B', args: { type: 'Attachment', from: 'tok', to: 'card1' } });
    expect('refused' in r && r.code === 'RULE_REFUSED').toBe(true);
    expect(core.getLogLength()).toBe(0);
  });
});

describe('D5 · replay tamper ALWAYS surfaces as DivergenceError (I-25; kills P7b)', () => {
  it('a tampered ontology move at rebuild → DivergenceError, never a raw domain throw', () => {
    const core = newOntoCore('d5-seed');
    core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Attachment', from: 'tok', to: 'card1' } });
    const row = core.toRow();
    const tampered = {
      ...row,
      moves: row.moves.map((m) => ({ ...m, args: { ...m.args, type: 'Teleport' } })),
    };
    const wireAll = (c: Parameters<typeof wireOntology>[0]) => {
      wirePack(c, F2_PACK);
      wireOntology(c);
    };
    expect(() => rebuild(tampered, ontoGenesis, wireAll)).toThrow(DivergenceError);
  });
});

describe('D6 · F3 replay byte-equality (compose · place · form · dissolve → rebuild ×2)', () => {
  it('a full ontology scenario rebuilds byte-identical', () => {
    const core = newOntoCore('f3-replay-seed');
    const wireAll = (c: Parameters<typeof wireOntology>[0]) => {
      wirePack(c, F2_PACK);
      wireOntology(c);
    };
    core.submit({ type: 'surface:compose', seat: 'A', args: { surface: 'map1', components: ['t1', 't2'], topology: 'grid' } });
    core.submit({ type: 'component:place', seat: 'A', args: { component: 'fig', surface: 'map1', position: { x: 0, y: 0 } } });
    core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Attachment', from: 'tok', to: 'card1' } });
    const rels = core.getState()['relations'] as readonly RelationRow[];
    const attachId = rels.find((r) => r.type === 'Attachment')!.id;
    core.submit({ type: 'relation:dissolve', seat: 'A', args: { relation: attachId } });

    const row = core.toRow();
    expect(rebuild(row, ontoGenesis, wireAll).getStateHash()).toBe(core.getStateHash());
    expect(rebuild(row, ontoGenesis, wireAll).getStateHash()).toBe(core.getStateHash());
  });
});

describe('D7 · the duplicate-surface guards have failing tests (kills MUT-F3-11/12)', () => {
  it('addSurface over an existing id refuses', () => {
    expect(() => addSurface(genesis(), 'table', 'grid')).toThrow(SurfaceRefusal);
    expect(() => addSurface(genesis(), 'table', 'grid')).toThrow(/supersede, never respec/);
  });

  it('composeSurface onto an existing surface id refuses', () => {
    const s = composeSurface(genesis(), 'map1', ['t1', 't2'], 'grid') as State;
    expect(() => composeSurface(s, 'map1', ['t2', 't3'], 'grid')).toThrow(/exists/);
  });
});

describe('D8 · composition/dissolution soundness', () => {
  it('duplicate component ids in a composition refuse', () => {
    expect(() => composeSurface(genesis(), 'm', ['t1', 't2', 't1'], 'grid')).toThrow(/duplicate component ids/);
  });

  it('an identical formed relation is not formed twice', () => {
    const s = formRelation(genesis(), { type: 'Attachment', from: 'tok', to: 'card1' });
    expect(() => formRelation(s, { type: 'Attachment', from: 'tok', to: 'card1' })).toThrow(/duplicates refused/);
  });

  it('dissolving a Placement clears the component\'s surface/position (no dangling location)', () => {
    let s = placeComponent(genesis(), 'fig', 'table', { x: 1, y: 1 }) as State;
    const placeId = (s['relations'] as readonly RelationRow[]).find((r) => r.type === 'Placement')!.id;
    s = dissolveRelation(s, placeId) as State;
    const fig = (s['components'] as Record<string, JsonObject>)['fig']!;
    expect(fig['surface']).toBeUndefined();
    expect(fig['position']).toBeUndefined();
  });

  it('retiring a composed surface DISSOLVES its Composition relations and emits on-dissolve', () => {
    const s = composeSurface(genesis(), 'map1', ['t1', 't2', 't3'], 'grid') as State;
    const after = retireComposedSurface(s, 'map1') as State;
    const rels = after['relations'] as readonly RelationRow[];
    expect(rels.filter((r) => r.type === 'Composition' && r.status === 'formed').length).toBe(0);
    const dissolves = (after['relationEvents'] as readonly { hook: string }[]).filter((e) => e.hook === 'on-dissolve');
    expect(dissolves.length).toBe(2);
  });

  it('an unknown relation dissolve still refuses (channel intact)', () => {
    expect(() => dissolveRelation(genesis(), 'r99')).toThrow(RelationRefusal);
  });
});

describe('P11/P12 · placement coherence (K7-F3 round-2 residues)', () => {
  it('P11: placing an already-placed component refuses — one component, one place', () => {
    let s = placeComponent(genesis(), 'fig', 'table', { x: 1, y: 1 }) as State;
    const s2 = composeSurface(s, 'map1', ['t1', 't2'], 'grid') as State;
    expect(() => placeComponent(s2, 'fig', 'map1', { x: 0, y: 0 })).toThrow(/already placed/);
  });

  it('P11: a STALE Placement dissolve never wipes a live location', () => {
    // forge the divergent shape K7 demonstrated: a formed row to 'table' while the
    // component's live surface is elsewhere
    let s = placeComponent(genesis(), 'fig', 'table', { x: 1, y: 1 }) as State;
    const forged = {
      ...s,
      components: {
        ...(s['components'] as Record<string, JsonObject>),
        fig: { ...(s['components'] as Record<string, JsonObject>)['fig']!, surface: 'map1' },
      },
    } as State;
    const placeId = (forged['relations'] as readonly RelationRow[]).find((r) => r.type === 'Placement')!.id;
    const after = dissolveRelation(forged, placeId) as State;
    const fig = (after['components'] as Record<string, JsonObject>)['fig']!;
    expect(fig['surface']).toBe('map1'); // the live location survived the stale dissolve
  });

  it('P12: retiring a surface dissolves Placements ONTO it — nothing strands', () => {
    let s = composeSurface(genesis(), 'map1', ['t1', 't2'], 'grid') as State;
    s = placeComponent(s, 'fig', 'map1', { x: 0, y: 0 }) as State;
    const after = retireComposedSurface(s, 'map1') as State;
    const fig = (after['components'] as Record<string, JsonObject>)['fig']!;
    expect(fig['surface']).toBeUndefined();
    expect(fig['position']).toBeUndefined();
    const formedPlacements = (after['relations'] as readonly RelationRow[]).filter(
      (r) => r.type === 'Placement' && r.status === 'formed'
    );
    expect(formedPlacements.length).toBe(0);
  });
});
