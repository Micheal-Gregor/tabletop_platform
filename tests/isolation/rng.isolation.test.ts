import { describe, it, expect } from 'vitest';
import { RNGStreams } from '../../packages/engine/src/kernel/rng.js';
import { RNGStream } from '../../packages/engine/src/kernel/rng-stream.js';

// OS-12 isolation test for RNGStreams (MOD-04, packages/engine/src/kernel/rng.ts).
// Declared input: gameSeed (the object-model row reads "RNGStreams: gameSeed"). The registry is built with
// that seed and nothing else, and its one public operation, stream, is called. stream takes one input, name,
// and the answer is shown to differ when only name differs and when only gameSeed differs. No environment,
// clock, globals or network is touched: the streams answer from (gameSeed, name) and how many draws were taken.

const COUNT = 8;

function sequenceOf(gameSeed: string, name: string, count: number): number[] {
  const stream = new RNGStreams(gameSeed).stream(name);
  return Array.from({ length: count }, () => stream.next());
}

describe('RNGStreams isolation: construction', () => {
  it('is constructed with the game seed alone and hands out streams', () => {
    const streams = new RNGStreams('seed-1');
    expect(streams.stream('dice')).toBeInstanceOf(RNGStream);
  });

  it('two registries built from the same seed answer the same, so nothing else is read', () => {
    expect(sequenceOf('seed-1', 'dice', COUNT)).toEqual(sequenceOf('seed-1', 'dice', COUNT));
  });
});

describe('RNGStreams isolation: stream varies with name', () => {
  it('two calls differing only in name give streams that differ in their name', () => {
    const streams = new RNGStreams('seed-1');
    expect(streams.stream('dice').name).toBe('dice');
    expect(streams.stream('deck').name).toBe('deck');
    expect(streams.stream('dice').name).not.toBe(streams.stream('deck').name);
  });

  it('two calls differing only in name give different sequences', () => {
    expect(sequenceOf('seed-1', 'dice', COUNT)).not.toEqual(sequenceOf('seed-1', 'deck', COUNT));
  });

  it.each(['deck', 'dice', 'crew', 'venture', 'window'])('the stream %s differs from a stream named "other"', (name) => {
    expect(sequenceOf('seed-1', name, COUNT)).not.toEqual(sequenceOf('seed-1', 'other', COUNT));
  });
});

describe('RNGStreams isolation: stream varies with gameSeed', () => {
  it('two registries differing only in gameSeed give different sequences for one name', () => {
    expect(sequenceOf('seed-A', 'dice', COUNT)).not.toEqual(sequenceOf('seed-B', 'dice', COUNT));
  });

  it.each(['seed-2', 'seed-3', '', 'a longer seed with spaces'])('the seed "%s" differs from "seed-1"', (seed) => {
    expect(sequenceOf(seed, 'dice', COUNT)).not.toEqual(sequenceOf('seed-1', 'dice', COUNT));
  });
});

describe('RNGStreams isolation: stream is get-or-create', () => {
  it('answers the one stream for a name every time it is asked', () => {
    const streams = new RNGStreams('seed-1');
    expect(streams.stream('dice')).toBe(streams.stream('dice'));
  });

  it('answers a different stream for a different name, and from a different registry', () => {
    const streams = new RNGStreams('seed-1');
    expect(streams.stream('dice')).not.toBe(streams.stream('deck'));
    expect(streams.stream('dice')).not.toBe(new RNGStreams('seed-1').stream('dice'));
  });

  it('keeps the stream running between asks: the second ask carries on from the first', () => {
    const streams = new RNGStreams('seed-1');
    const first = streams.stream('dice').next();
    const second = streams.stream('dice').next();
    expect([first, second]).toEqual(sequenceOf('seed-1', 'dice', 2));
    expect(first).not.toBe(second);
  });

  it('draws on one stream never shift another', () => {
    const streams = new RNGStreams('seed-1');
    for (let i = 0; i < 20; i++) streams.stream('dice').next();
    expect(streams.stream('deck').next()).toBe(sequenceOf('seed-1', 'deck', 1)[0]);
  });
});
