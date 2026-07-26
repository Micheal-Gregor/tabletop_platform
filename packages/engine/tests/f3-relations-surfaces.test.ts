/** GBC-21..24 — relations (R-12/R-13, S-4 emissions), topologies, and the V-6 recursion. */
import { describe, expect, it } from 'vitest';
import {
  RelationRefusal,
  SurfaceRefusal,
  addSurface,
  composeSurface,
  dissolveRelation,
  formRelation,
  placeComponent,
  positionValid,
  readThroughRepresentation,
  retireComposedSurface,
  writeThroughRepresentation,
} from '../src/index.js';
import type { JsonObject, RelationRow, State } from '../src/index.js';
import { ontoGenesis } from './f3-fixture.js';

const genesis = (): State => ontoGenesis({ id: 'x', version: '0', hash: '0' }, [], 'seed');
const events = (s: State) => s['relationEvents'] as readonly JsonObject[];

describe('GBC-21 · relations form by predicate; emissions recorded (GX-15, S-4/I-21)', () => {
  it('a holding Placement forms and emits on-form', () => {
    const s = formRelation(genesis(), { type: 'Placement', from: 't1', to: 'table' });
    const rels = s['relations'] as readonly RelationRow[];
    expect(rels[0]).toMatchObject({ type: 'Placement', from: 't1', to: 'table', status: 'formed' });
    expect(events(s)[0]).toMatchObject({ hook: 'on-form', type: 'Placement' });
  });

  it('a failing predicate refuses NAMING the failure; nothing emitted', () => {
    expect(() => formRelation(genesis(), { type: 'Placement', from: 'ghost', to: 'table' })).toThrow(/unknown component/);
    expect(() => formRelation(genesis(), { type: 'Composition', from: 't1', to: 't1' })).toThrow(/itself/);
  });

  it('R-13: an unknown relation type = no formation predicate → refused (the five are closed)', () => {
    expect(() => formRelation(genesis(), { type: 'Teleport', from: 't1', to: 't2' })).toThrow(RelationRefusal);
    expect(() => formRelation(genesis(), { type: 'Teleport', from: 't1', to: 't2' })).toThrow(/R-13/);
  });

  it('dissolution mirrors: emits on-dissolve; dissolving a phantom refuses', () => {
    let s = formRelation(genesis(), { type: 'Attachment', from: 'tok', to: 'card1' });
    const id = (s['relations'] as readonly RelationRow[])[0]!.id;
    s = dissolveRelation(s, id) as State;
    expect(events(s).at(-1)).toMatchObject({ hook: 'on-dissolve', relation: id });
    expect(() => dissolveRelation(s, id)).toThrow(/no such formed relation/); // already dissolved
    expect(() => dissolveRelation(s, 'r999')).toThrow(RelationRefusal);
  });
});

describe('GBC-22 · Representation: views never own (GX-16, R-12)', () => {
  const withRep = () => {
    const s = formRelation(genesis(), {
      type: 'Representation',
      from: 'tok',
      to: 'derived',
      sourcePath: 'turn.round',
      mode: 'read-only',
    });
    return { s, id: (s['relations'] as readonly RelationRow[])[0]!.id };
  };

  it('reads resolve the derived value', () => {
    const { s, id } = withRep();
    expect(readThroughRepresentation(s, id)).toBe(1); // turn.round at genesis
  });

  it('R-12: a write through the representation refuses', () => {
    const { s, id } = withRep();
    expect(() => writeThroughRepresentation(s, id)).toThrow(/R-12/);
  });

  it('forming with mode ≠ read-only (or no sourcePath) refuses at formation', () => {
    expect(() =>
      formRelation(genesis(), { type: 'Representation', from: 'tok', to: 'derived', sourcePath: 'turn.round', mode: 'write' })
    ).toThrow(/read-only/);
    expect(() =>
      formRelation(genesis(), { type: 'Representation', from: 'tok', to: 'derived', mode: 'read-only' })
    ).toThrow(/sourcePath/);
  });
});

describe('GBC-23 · topology-aware placement (GX-17)', () => {
  it('each of the five topologies enforces its position shape', () => {
    expect(positionValid('grid', { x: 2, y: 3 })).toBe(true);
    expect(positionValid('grid', { x: 2.5, y: 3 })).toMatch(/integer/);
    expect(positionValid('hex', { q: -1, r: 4 })).toBe(true);
    expect(positionValid('hex', { x: 1, y: 1 })).toMatch(/\{q, r\}/);
    expect(positionValid('track', { index: 0 })).toBe(true);
    expect(positionValid('track', { index: -1 })).toMatch(/non-negative/);
    expect(positionValid('slots', { slot: 'engine-room' })).toBe(true);
    expect(positionValid('slots', { slot: 7 as never })).toMatch(/string/);
    expect(positionValid('freeform', { x: 1.5, y: -2.25 })).toBe(true);
    expect(positionValid('freeform', { x: Infinity, y: 0 })).toMatch(/finite/);
  });

  it('placement writes the component location AND forms the Placement relation', () => {
    const s = placeComponent(genesis(), 'fig', 'table', { x: 1, y: 1 });
    const comp = (s['components'] as Record<string, JsonObject>)['fig']!;
    expect(comp['surface']).toBe('table');
    expect((s['relations'] as readonly RelationRow[]).some((r) => r.type === 'Placement' && r.from === 'fig')).toBe(true);
  });

  it('a wrong-shape placement refuses; an unknown topology refuses at surface creation', () => {
    expect(() => placeComponent(genesis(), 'fig', 'table', { q: 1, r: 1 })).toThrow(SurfaceRefusal);
    expect(() => addSurface(genesis(), 'weird', 'moebius')).toThrow(/unknown topology/);
  });
});

describe('GBC-24 · the recursion: composed tiles FORM a Surface (GX-17 — V-6\'s law)', () => {
  it('composing t1·t2·t3 creates a Surface; placing onto the built map WORKS', () => {
    let s = composeSurface(genesis(), 'map1', ['t1', 't2', 't3'], 'grid') as State;
    const surf = (s['surfaces'] as Record<string, { topology: string; composedOf?: string[] }>)['map1']!;
    expect(surf.composedOf).toEqual(['t1', 't2', 't3']);
    // pairwise Composition relations formed + emitted
    const rels = s['relations'] as readonly RelationRow[];
    expect(rels.filter((r) => r.type === 'Composition').length).toBe(2);
    // THE LAW: the built map IS a Surface — placement onto it succeeds
    s = placeComponent(s, 'fig', 'map1', { x: 0, y: 0 }) as State;
    expect(((s['components'] as Record<string, JsonObject>)['fig'] as JsonObject)['surface']).toBe('map1');
  });

  it('composition needs ≥2 components; a failing pairwise predicate aborts the whole compose', () => {
    expect(() => composeSurface(genesis(), 'm', ['t1'], 'grid')).toThrow(/at least two/);
    expect(() => composeSurface(genesis(), 'm', ['t1', 'ghost'], 'grid')).toThrow(/unknown component/);
  });

  it('retiring the composed surface removes it; the base surface is not retirable', () => {
    const s = composeSurface(genesis(), 'map1', ['t1', 't2'], 'grid') as State;
    const after = retireComposedSurface(s, 'map1') as State;
    expect((after['surfaces'] as Record<string, unknown>)['map1']).toBeUndefined();
    expect(() => retireComposedSurface(after, 'table')).toThrow(/not a composed surface/);
  });
});
