/** R-2 / GBC-8 / HK-4 — load refusal NAMES defects; EFX closure + version + schema. */
import { describe, expect, it } from 'vitest';
import { hookHk4ValidatePack, PackLoadRefusal, loadPack } from '../src/index.js';
import { F2_PACK } from './f2-fixture.js';

describe('R-2 · pack validation names its defects (GX-10)', () => {
  it('fx ∉ EFX → refusal naming the descriptor AND the card', () => {
    const bad = {
      ...F2_PACK,
      cards: { ...F2_PACK.cards, dragon: { fx: [{ fx: 'summon_dragon', power: 9 }] } },
      decks: { main: { cards: ['dragon'] } },
    };
    expect(() => hookHk4ValidatePack(bad)).toThrow(PackLoadRefusal);
    try {
      hookHk4ValidatePack(bad);
    } catch (e) {
      const msg = (e as PackLoadRefusal).message;
      expect(msg).toContain('summon_dragon');
      expect(msg).toContain('dragon');
    }
  });

  it('unknown EFX version → refusal naming the version', () => {
    const bad = { ...F2_PACK, efxVersion: '9.9.9' };
    expect(() => hookHk4ValidatePack(bad)).toThrow(/9\.9\.9/);
  });

  it('deck referencing an unknown card → refusal naming both', () => {
    const bad = { ...F2_PACK, decks: { main: { cards: ['ghost_card'] } } };
    expect(() => hookHk4ValidatePack(bad)).toThrow(/ghost_card/);
  });

  it('multiple defects are ALL named in one refusal', () => {
    const bad = {
      ...F2_PACK,
      efxVersion: '0.1',
      maxRounds: 0,
      cards: { ...F2_PACK.cards, dragon: { fx: [{ fx: 'summon_dragon' }] } },
    };
    try {
      hookHk4ValidatePack(bad);
      throw new Error('should have refused');
    } catch (e) {
      const msg = (e as PackLoadRefusal).message;
      expect(msg).toContain('0.1');
      expect(msg).toContain('maxRounds');
      expect(msg).toContain('summon_dragon');
    }
  });

  it('an invalid pack never wires a single intent (validation FIRST)', () => {
    const bad = { ...F2_PACK, efxVersion: 'nope' };
    expect(() => loadPack(bad)).toThrow(PackLoadRefusal);
  });

  it('the valid fixture pack loads clean', () => {
    expect(() => hookHk4ValidatePack(F2_PACK)).not.toThrow();
  });
});
