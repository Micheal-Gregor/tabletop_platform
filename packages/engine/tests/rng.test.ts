/** GBC-6 + GBC-7 / GX-5 — stream isolation, determinism, human-inputs-as-arguments. */
import { describe, expect, it } from 'vitest';
import { RNGStreams } from '../src/index.js';
import { newCore } from './fixture.js';

describe('GBC-6 · stream isolation & determinism', () => {
  it('same (seed, name, index) → same value, always', () => {
    const a = new RNGStreams('seed-X').stream('dice');
    const b = new RNGStreams('seed-X').stream('dice');
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('consuming one stream never shifts another', () => {
    const fresh = new RNGStreams('seed-Y');
    const control = [fresh.stream('deck').next(), fresh.stream('deck').next()];

    const noisy = new RNGStreams('seed-Y');
    for (let i = 0; i < 50; i++) noisy.stream('dice').next(); // heavy neighbor traffic
    const observed = [noisy.stream('deck').next(), noisy.stream('deck').next()];

    expect(observed).toEqual(control);
  });

  it('different streams from one seed are distinct sequences', () => {
    const s = new RNGStreams('seed-Z');
    const dice = Array.from({ length: 8 }, () => s.stream('dice').next());
    const deck = Array.from({ length: 8 }, () => s.stream('deck').next());
    expect(dice).not.toEqual(deck);
  });
});

describe('GBC-7 · human inputs are arguments, never entropy', () => {
  it('a human choice lands in the log as args and consumes zero stream draws', () => {
    const core = newCore('seed-H');
    core.submit({ type: 'tally:add', seat: 'A', args: { n: 3 } }); // the human's chosen value

    const row = core.toRow();
    expect(row.moves[0]?.args['n']).toBe(3); // choice recorded as ARGUMENT (replayable)

    // and the dice stream is untouched by it: first roll matches a fresh same-seed roll
    const r1 = core.submit({ type: 'dice:roll', seat: 'A', args: {} });
    const fresh = newCore('seed-H');
    const r2 = fresh.submit({ type: 'dice:roll', seat: 'A', args: {} });
    if ('ok' in r1 && 'ok' in r2) {
      expect((r1.state['lastRoll'] as { value: number }).value).toBe(
        (r2.state['lastRoll'] as { value: number }).value
      );
    } else {
      throw new Error('fixture defect');
    }
  });
});
