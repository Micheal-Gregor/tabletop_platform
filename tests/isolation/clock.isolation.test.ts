import { describe, it, expect } from 'vitest';
import { Timeline } from '../../packages/presentation/src/clock.js';

// OS-12 isolation test for Timeline (MOD-35, packages/presentation/src/clock.ts).
// Declared inputs: none (the object-model row reads "Timeline: none"). The timeline is built with nothing
// and every public operation is called: now and advance. advance takes one input, ms, and two calls
// differing only in ms are shown to answer differently, both in what advance returns and in what now reads
// afterwards. advance's refusal for a non-finite or negative ms is shown, and shown to leave the timeline as
// it was. No environment, clock, globals or network is touched: the timeline moves only when advance is told to.

const REFUSAL = 'Timeline refused: advance must be finite and non-negative';

function advancedBy(...steps: number[]): Timeline {
  const timeline = new Timeline();
  for (const ms of steps) timeline.advance(ms);
  return timeline;
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

describe('Timeline isolation: construction', () => {
  it('is constructed with no input and starts at zero', () => {
    expect(new Timeline().now()).toBe(0);
  });

  it('two timelines do not share their time', () => {
    const first = advancedBy(40);
    const second = new Timeline();
    expect(first.now()).toBe(40);
    expect(second.now()).toBe(0);
    expect(first.now()).not.toBe(second.now());
  });

  it('answers the same from the same start, whatever the host clock says', () => {
    expect(new Timeline().now()).toBe(new Timeline().now());
    expect(advancedBy(16, 16).now()).toBe(advancedBy(16, 16).now());
  });
});

describe('Timeline isolation: now', () => {
  it('reads the time without moving it', () => {
    const timeline = advancedBy(25);
    expect([timeline.now(), timeline.now(), timeline.now()]).toEqual([25, 25, 25]);
  });

  it('follows what advance has been told, so timelines advanced differently read differently', () => {
    expect(advancedBy(10).now()).not.toBe(advancedBy(20).now());
    expect(advancedBy(10, 10).now()).toBe(advancedBy(20).now());
  });

  it('reads the earlier time before an advance and the later time after it', () => {
    const timeline = new Timeline();
    const before = timeline.now();
    timeline.advance(33);
    expect(timeline.now()).not.toBe(before);
    expect([before, timeline.now()]).toEqual([0, 33]);
  });
});

describe('Timeline isolation: advance answers the new time', () => {
  it('returns what now reads afterwards', () => {
    const timeline = new Timeline();
    const returned = timeline.advance(12);
    expect(returned).toBe(12);
    expect(timeline.now()).toBe(returned);
  });

  it.each([1, 16, 250, 1000])('two calls differing only in ms (%s against 7) answer differently', (ms) => {
    const one = new Timeline().advance(ms);
    const other = new Timeline().advance(7);
    expect(one).toBe(ms);
    expect(one).not.toBe(other);
  });

  it('two calls differing only in ms leave different times to read', () => {
    const slow = new Timeline();
    const fast = new Timeline();
    slow.advance(5);
    fast.advance(50);
    expect(slow.now()).not.toBe(fast.now());
  });

  it('adds each ms to what is already there, so the order of equal steps does not matter but the sum does', () => {
    const timeline = new Timeline();
    expect([timeline.advance(10), timeline.advance(5), timeline.advance(2.5)]).toEqual([10, 15, 17.5]);
    expect(advancedBy(2.5, 5, 10).now()).toBe(timeline.now());
    expect(advancedBy(10, 5).now()).not.toBe(timeline.now());
  });

  it('accepts zero and answers the time it already had', () => {
    const timeline = advancedBy(9);
    expect(timeline.advance(0)).toBe(9);
    expect(timeline.now()).toBe(9);
  });

  it('is monotonic: no accepted ms moves the time backwards', () => {
    const timeline = new Timeline();
    const readings = [3, 0, 8, 0.5].map((ms) => timeline.advance(ms));
    expect(readings).toEqual([3, 3, 11, 11.5]);
    expect([...readings].sort((a, b) => a - b)).toEqual(readings);
  });
});

describe('Timeline isolation: advance refuses a non-finite or negative ms', () => {
  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative Infinity', Number.NEGATIVE_INFINITY],
    ['a negative number', -1],
    ['a small negative number', -0.001],
  ])('%s is refused with the typed message', (_label, ms) => {
    const refusal = refusalOf(() => new Timeline().advance(ms));
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal.message).toBe(REFUSAL);
  });

  it('a refused advance leaves the time as it was', () => {
    const timeline = advancedBy(14);
    refusalOf(() => timeline.advance(-5));
    refusalOf(() => timeline.advance(Number.NaN));
    expect(timeline.now()).toBe(14);
  });

  it('the same call is accepted where its ms is valid and refused where it is not', () => {
    const timeline = new Timeline();
    expect(() => timeline.advance(-1)).toThrow(REFUSAL);
    expect(timeline.advance(1)).toBe(1);
    expect(() => timeline.advance(Number.POSITIVE_INFINITY)).toThrow(REFUSAL);
    expect(timeline.advance(1)).toBe(2);
  });

  it('is told apart from a broken call: a valid ms answers a number, an invalid one throws', () => {
    expect(typeof new Timeline().advance(4)).toBe('number');
    expect(() => new Timeline().advance(-4)).toThrow(Error);
  });
});
