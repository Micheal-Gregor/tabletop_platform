/** F4 on-path: rules:pump through core.submit — HK-9/dispatch on the real orchestrated path + replay. */
import { describe, expect, it } from 'vitest';
import { EngineCore, RuleRegistry, rebuild, wireOntology, wirePack, wireRules } from '../src/index.js';
import type { RuleContribution, State } from '../src/index.js';
import { ontoGenesis } from './f3-fixture.js';
import { F2_PACK, f2PackRef, f2Seats } from './f2-fixture.js';

const MONSTER: RuleContribution = {
  id: 'monster',
  bearer: { relationType: 'Attachment' },
  trigger: 'on-form:Attachment',
  condition: { op: 'always' },
  effects: [{ fx: 'levy', scope: 'table', amount: 2 }],
  declaredSlots: [{ name: 'fired', reset: 'never' }],
  slotWrites: [{ slot: 'fired', increment: 1 }],
  vocabVersions: { efx: '1.1.1', hooks: '1.0' },
};

function wireAll(registry: RuleRegistry) {
  return (c: EngineCore): void => {
    wirePack(c, F2_PACK);
    wireOntology(c);
    wireRules(c, registry);
  };
}

describe('rules:pump on the real path', () => {
  it('form → pump: the monster fires through EffectEngine; the slot counts; all LOGGED', () => {
    const registry = new RuleRegistry();
    registry.register(MONSTER);
    const core = new EngineCore(f2PackRef, f2Seats, 'f4-seed', ontoGenesis);
    wireAll(registry)(core);

    core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Attachment', from: 'tok', to: 'card1' } });
    const r = core.submit({ type: 'rules:pump', seat: 'A', args: {} });
    expect('ok' in r && r.ok).toBe(true);

    const s = core.getState();
    expect((s['seats'] as readonly { cash: number }[])[0]!.cash).toBe(-2);
    expect(((s['ruleSlots'] as Record<string, Record<string, number>>)['monster'] ?? {})['fired']).toBe(1);
    expect(core.getLogLength()).toBe(2);
  });

  it('a second pump is idempotent (cursor on state) — replay-deterministic', () => {
    const registry = new RuleRegistry();
    registry.register(MONSTER);
    const core = new EngineCore(f2PackRef, f2Seats, 'f4-seed2', ontoGenesis);
    wireAll(registry)(core);
    core.submit({ type: 'relation:form', seat: 'A', args: { type: 'Attachment', from: 'tok', to: 'card1' } });
    core.submit({ type: 'rules:pump', seat: 'A', args: {} });
    core.submit({ type: 'rules:pump', seat: 'A', args: {} }); // nothing new to drain
    expect((core.getState()['seats'] as readonly { cash: number }[])[0]!.cash).toBe(-2); // once

    // F4 replay byte-equality: the row (form + pump + pump) rebuilds identically
    const row = core.toRow();
    expect(rebuild(row, ontoGenesis, wireAll(registry)).getStateHash()).toBe(core.getStateHash());
    expect(rebuild(row, ontoGenesis, wireAll(registry)).getStateHash()).toBe(core.getStateHash());
  });

  it('turn discipline holds: seat B cannot pump on A\'s turn', () => {
    const registry = new RuleRegistry();
    const core = new EngineCore(f2PackRef, f2Seats, 'f4-seed3', ontoGenesis);
    wireAll(registry)(core);
    const r = core.submit({ type: 'rules:pump', seat: 'B', args: {} });
    expect('refused' in r && r.code === 'RULE_REFUSED').toBe(true);
  });
});
