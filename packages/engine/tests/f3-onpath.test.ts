/** HK-7/HK-8 falsifiability on the REAL orchestrated path (core.submit via wireOntology). */
import { describe, expect, it } from 'vitest';
import { RelationRefusal } from '../src/index.js';
import { newOntoCore } from './f3-fixture.js';

describe('HK-8 on-path · relation:form through core.submit', () => {
  it('legal form succeeds and is LOGGED; the emission lands on-state', () => {
    const core = newOntoCore();
    const r = core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Attachment', from: 'tok', to: 'card1' } });
    expect('ok' in r && r.ok).toBe(true);
    expect(core.getLogLength()).toBe(1);
    const ev = core.getState()['relationEvents'] as readonly { hook: string }[];
    expect(ev[0]!.hook).toBe('on-form');
  });

  it('unknown type (R-13) and failing predicate refuse LOUDLY on-path: state intact, unlogged', () => {
    const core = newOntoCore();
    const hash = core.getStateHash();
    expect(() =>
      core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Teleport', from: 't1', to: 't2' } })
    ).toThrow(RelationRefusal);
    expect(() =>
      core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Placement', from: 'ghost', to: 'table' } })
    ).toThrow(RelationRefusal);
    expect(core.getStateHash()).toBe(hash);
    expect(core.getLogLength()).toBe(0);
  });

  it('R-12 on-path: forming a writable Representation refuses through submit', () => {
    const core = newOntoCore();
    expect(() =>
      core.submit({
        type: 'relation:form',
        seat: 'A',
        args: { type: 'Representation', from: 'tok', to: 'derived', sourcePath: 'turn.round', mode: 'write' },
      })
    ).toThrow(/read-only/);
  });
});

describe('surface intents on-path · compose recursion + placement through core.submit', () => {
  it('compose → place-onto-built-map → dissolve, all logged; replay-relevant regions updated', () => {
    const core = newOntoCore();
    const c = core.submit({
      type: 'surface:compose',
      seat: 'A',
      args: { surface: 'map1', components: ['t1', 't2'], topology: 'grid' },
    });
    expect('ok' in c && c.ok).toBe(true);
    const p = core.submit({
      type: 'component:place',
      seat: 'A',
      args: { component: 'fig', surface: 'map1', position: { x: 0, y: 0 } },
    });
    expect('ok' in p && p.ok).toBe(true);
    expect(core.getLogLength()).toBe(2);
  });

  it('wrong-shape placement refuses on-path, unlogged', () => {
    const core = newOntoCore();
    core.submit({ type: 'surface:add', seat: 'A', args: { surface: 'hexmap', topology: 'hex' } });
    const logBefore = core.getLogLength();
    expect(() =>
      core.submit({ type: 'component:place', seat: 'A', args: { component: 'fig', surface: 'hexmap', position: { x: 1, y: 1 } } })
    ).toThrow(/\{q, r\}/);
    expect(core.getLogLength()).toBe(logBefore);
  });
});
