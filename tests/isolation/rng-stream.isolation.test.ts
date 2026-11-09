import { describe, it, expect } from 'vitest';
import { RNGStream } from '../../packages/engine/src/kernel/rng-stream.js';

// OS-12 isolation test for RNGStream (MOD-04, packages/engine/src/kernel/rng-stream.ts).
// Declared inputs: name and gameSeed (the object-model row reads "RNGStream: name, gameSeed"). The stream is
// built with those two and nothing else, and every public operation is called: next and nextInt, and the
// public field name is read. For each declared input two streams differing only in that input are shown to
// answer differently. nextInt's refusal for a non-positive or non-integer n is shown, and shown to leave the
// stream where it was. No environment, clock, globals or network is touched.

const COUNT = 8;
const RANGE = 1000;

function floatsOf(name: string, gameSeed: string): number[] {
  const stream = new RNGStream(name, gameSeed);
  return Array.from({ length: COUNT }, () => stream.next());
}

function intsOf(name: string, gameSeed: string, n: number): number[] {
  const stream = new RNGStream(name, gameSeed);
  return Array.from({ length: COUNT }, () => stream.nextInt(n));
}

function refusalOf(run: () => unknown): Error {
  try {
    run();
  } catch (e) {
    if (e instanceof Error) return e;
    throw e;
  }
  throw new Error('expected a refusal and none was thrown');
}

describe('RNGStream isolation: construction and name', () => {
  it('is constructed with name and gameSeed and exposes the name it was given', () => {
    expect(new RNGStream('dice', 'seed-1').name).toBe('dice');
    expect(new RNGStream('deck', 'seed-1').name).toBe('deck');
  });

  it('two streams built from the same inputs answer the same, so nothing else is read', () => {
    expect(floatsOf('dice', 'seed-1')).toEqual(floatsOf('dice', 'seed-1'));
    expect(intsOf('dice', 'seed-1', 6)).toEqual(intsOf('dice', 'seed-1', 6));
  });
});

describe('RNGStream isolation: next', () => {
  it('answers a float in [0, 1) each call', () => {
    for (const value of floatsOf('dice', 'seed-1')) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('advances: consecutive calls answer different values', () => {
    const stream = new RNGStream('dice', 'seed-1');
    expect(stream.next()).not.toBe(stream.next());
    expect(new Set(floatsOf('dice', 'seed-1')).size).toBe(COUNT);
  });

  it('two streams differing only in name give different sequences', () => {
    expect(floatsOf('dice', 'seed-1')).not.toEqual(floatsOf('deck', 'seed-1'));
  });

  it('two streams differing only in gameSeed give different sequences', () => {
    expect(floatsOf('dice', 'seed-A')).not.toEqual(floatsOf('dice', 'seed-B'));
  });

  it('the first draw alone already differs by name and by gameSeed', () => {
    const base = new RNGStream('dice', 'seed-1').next();
    expect(new RNGStream('deck', 'seed-1').next()).not.toBe(base);
    expect(new RNGStream('dice', 'seed-2').next()).not.toBe(base);
  });
});

describe('RNGStream isolation: nextInt', () => {
  it.each([1, 2, 6, 52, RANGE])('answers an integer in [0, n) for n = %s', (n) => {
    for (const value of intsOf('dice', 'seed-1', n)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(n);
    }
  });

  it('answers zero for n = 1, the only integer in [0, 1)', () => {
    expect(intsOf('dice', 'seed-1', 1)).toEqual(Array(COUNT).fill(0));
  });

  it('two calls differing only in n give different sequences', () => {
    expect(intsOf('dice', 'seed-1', 6)).not.toEqual(intsOf('dice', 'seed-1', RANGE));
  });

  it('two streams differing only in name give different integers', () => {
    expect(intsOf('dice', 'seed-1', RANGE)).not.toEqual(intsOf('deck', 'seed-1', RANGE));
  });

  it('two streams differing only in gameSeed give different integers', () => {
    expect(intsOf('dice', 'seed-A', RANGE)).not.toEqual(intsOf('dice', 'seed-B', RANGE));
  });

  it('draws from the same stream as next: nextInt(n) is the next float scaled to n and floored', () => {
    const viaInt = new RNGStream('dice', 'seed-1');
    const viaFloat = new RNGStream('dice', 'seed-1');
    expect(viaInt.nextInt(RANGE)).toBe(Math.floor(viaFloat.next() * RANGE));
    expect(viaInt.next()).toBe(viaFloat.next());
  });
});

describe('RNGStream isolation: nextInt refuses a non-positive or non-integer n', () => {
  it.each([
    ['zero', 0],
    ['a negative integer', -3],
    ['a fraction', 2.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative Infinity', Number.NEGATIVE_INFINITY],
  ])('%s is refused with the typed message naming the stream and the n', (_label, n) => {
    const refusal = refusalOf(() => new RNGStream('dice', 'seed-1').nextInt(n));
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal.message).toBe(`RNGStream(dice): nextInt requires a positive integer, got ${n}`);
  });

  it('the refusal names the stream, so two streams differing only in name refuse differently', () => {
    const dice = refusalOf(() => new RNGStream('dice', 'seed-1').nextInt(0));
    const deck = refusalOf(() => new RNGStream('deck', 'seed-1').nextInt(0));
    expect(dice.message).not.toBe(deck.message);
  });

  it('a refused call draws nothing: the stream carries on from where it was', () => {
    const stream = new RNGStream('dice', 'seed-1');
    refusalOf(() => stream.nextInt(-1));
    refusalOf(() => stream.nextInt(1.5));
    expect(stream.next()).toBe(new RNGStream('dice', 'seed-1').next());
  });

  it('the same call is accepted where n is valid and refused where it is not', () => {
    const stream = new RNGStream('dice', 'seed-1');
    expect(() => stream.nextInt(0)).toThrow('nextInt requires a positive integer');
    expect(stream.nextInt(6)).toBeLessThan(6);
  });
});
