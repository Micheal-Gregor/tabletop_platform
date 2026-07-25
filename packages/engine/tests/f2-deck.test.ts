/** GBC-14 / GX-12 — deck determinism, order-preserving inject, legal empty draw. */
import { describe, expect, it } from 'vitest';
import { RNGStreams, shuffledOrder } from '../src/index.js';
import { F2_PACK, newF2Core } from './f2-fixture.js';

describe('GBC-14 · decks are streams + order (GX-12)', () => {
  it('same seed → identical shuffle, across independent builds', () => {
    const cards = ['a', 'b', 'c', 'd', 'e', 'f'];
    const o1 = shuffledOrder(cards, new RNGStreams('deck-seed'), 'main');
    const o2 = shuffledOrder(cards, new RNGStreams('deck-seed'), 'main');
    expect(o1).toEqual(o2);
    expect([...o1].sort()).toEqual([...cards].sort()); // permutation, no loss
  });

  it('two decks from one seed shuffle on ISOLATED streams', () => {
    const cards = ['a', 'b', 'c', 'd', 'e', 'f'];
    const rng = new RNGStreams('deck-seed2');
    const main = shuffledOrder(cards, rng, 'main');
    // consuming main's stream must not shift side's sequence
    const side1 = shuffledOrder(cards, new RNGStreams('deck-seed2'), 'side');
    const side2 = shuffledOrder(cards, rng, 'side');
    expect(side2).toEqual(side1);
    void main;
  });

  it('drawing an empty deck is LEGAL — yields none, refuses nothing', () => {
    const core = newF2Core('empty-seed', {
      ...F2_PACK,
      cards: { payday: F2_PACK.cards['payday']! },
      decks: { main: { cards: ['payday'] } },
    });
    const r1 = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    expect('ok' in r1 && r1.ok).toBe(true);
    const r2 = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }); // now empty
    expect('ok' in r2 && r2.ok).toBe(true); // legal none (Stage-2b S8)
    const logLen = core.getLogLength();
    expect(logLen).toBe(2); // both draws are real, logged intents
  });

  it('deck_inject bottom preserves the existing order (living deck)', () => {
    const core = newF2Core('inject-seed', {
      ...F2_PACK,
      cards: {
        payday: F2_PACK.cards['payday']!,
        tax: F2_PACK.cards['tax']!,
        seed_card: F2_PACK.cards['seed_card']!,
      },
      decks: { main: { cards: ['payday', 'tax', 'seed_card'] } },
    });
    const before = (core.getState()['decks'] as Record<string, { draw: string[] }>)['main']!.draw;
    // draw until seed_card fires its deck_inject(payday → bottom)
    let injected = false;
    for (let i = 0; i < 3 && !injected; i++) {
      const top = (core.getState()['decks'] as Record<string, { draw: string[] }>)['main']!.draw[0];
      core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
      if (top === 'seed_card') injected = true;
    }
    expect(injected).toBe(true);
    const after = (core.getState()['decks'] as Record<string, { draw: string[] }>)['main']!.draw;
    expect(after[after.length - 1]).toBe('payday'); // injected at bottom
    // and the surviving pre-inject order is preserved (order-preserving law)
    const survivors = after.slice(0, -1);
    const expected = before.filter((c) => survivors.includes(c));
    expect(survivors).toEqual(expected);
    void expected;
  });
});
