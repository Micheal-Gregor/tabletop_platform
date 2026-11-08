import { describe, it, expect } from 'vitest';
import { IntentLog } from '../../packages/engine/src/kernel/intentlog.js';
import type { Intent, PackRef, Seat } from '../../packages/engine/src/kernel/types.js';

// OS-12 isolation test for IntentLog (MOD-03, packages/engine/src/kernel/intentlog.ts).
// Declared inputs: none at construction. Operations: append(intent), length, snapshot(),
// toRow(packRef, seed, seats). Each is called with two answers that differ in one input only.
// No environment, clock, globals or network is touched.

const PASS: Intent = { type: 'pass', seat: 'a', args: { n: 1 } };
const MOVE: Intent = { type: 'move', seat: 'b', args: { to: 'x' } };

const PACK: PackRef = { id: 'minimal', version: '1.0.0', hash: 'aaaa' };
const OTHER_PACK: PackRef = { id: 'minimal', version: '1.0.1', hash: 'bbbb' };
const SEATS: readonly Seat[] = [{ id: 'a' }, { id: 'b' }];
const OTHER_SEATS: readonly Seat[] = [{ id: 'z' }];

function logOf(...intents: Intent[]): IntentLog {
  const log = new IntentLog();
  for (const intent of intents) log.append(intent);
  return log;
}

describe('IntentLog isolation: append(intent)', () => {
  it('the intent appended is the intent held', () => {
    expect(logOf(PASS).snapshot()).toEqual([PASS]);
    expect(logOf(MOVE).snapshot()).not.toEqual(logOf(PASS).snapshot());
  });

  it('the order appended is the order held', () => {
    const forward = logOf(PASS, MOVE).snapshot();
    const backward = logOf(MOVE, PASS).snapshot();
    expect(forward).toEqual([PASS, MOVE]);
    expect(backward).not.toEqual(forward);
  });

  it('a new log holds nothing until something is appended', () => {
    expect(new IntentLog().snapshot()).toEqual([]);
    expect(logOf(PASS).snapshot()).not.toEqual(new IntentLog().snapshot());
  });
});

describe('IntentLog isolation: length', () => {
  it('counts what was appended', () => {
    expect(new IntentLog().length).toBe(0);
    expect(logOf(PASS).length).toBe(1);
    expect(logOf(PASS, MOVE).length).not.toBe(logOf(PASS).length);
  });

  it('the same intent appended twice counts twice', () => {
    expect(logOf(PASS, PASS).length).toBe(2);
  });
});

describe('IntentLog isolation: snapshot()', () => {
  it('follows the log: a log with one more intent snapshots differently', () => {
    const shorter = logOf(PASS).snapshot();
    const longer = logOf(PASS, MOVE).snapshot();
    expect(longer).not.toEqual(shorter);
    expect(longer).toHaveLength(2);
  });

  it('is a copy: changing it leaves the log as it was', () => {
    const log = logOf(PASS);
    (log.snapshot() as Intent[]).push(MOVE);
    expect(log.length).toBe(1);
    expect(log.snapshot()).toEqual([PASS]);
  });

  it('is a copy taken at the time: a later append is not in an earlier snapshot', () => {
    const log = logOf(PASS);
    const earlier = log.snapshot();
    log.append(MOVE);
    expect(earlier).toEqual([PASS]);
    expect(log.snapshot()).not.toEqual(earlier);
  });

  it('the same log twice gives equal answers that are not the same array', () => {
    const log = logOf(PASS, MOVE);
    expect(log.snapshot()).toEqual(log.snapshot());
    expect(log.snapshot()).not.toBe(log.snapshot());
  });
});

describe('IntentLog isolation: toRow(packRef, seed, seats)', () => {
  const log = logOf(PASS, MOVE);

  it('the row is {packRef, seed, seats, moves} from what was handed in and held', () => {
    expect(log.toRow(PACK, 'seven', SEATS)).toEqual({
      packRef: PACK,
      seed: 'seven',
      seats: SEATS,
      moves: [PASS, MOVE],
    });
  });

  it('the packRef decides the row', () => {
    expect(log.toRow(OTHER_PACK, 'seven', SEATS)).not.toEqual(log.toRow(PACK, 'seven', SEATS));
  });

  it('the seed decides the row', () => {
    expect(log.toRow(PACK, 'eight', SEATS)).not.toEqual(log.toRow(PACK, 'seven', SEATS));
  });

  it('the seats decide the row', () => {
    expect(log.toRow(PACK, 'seven', OTHER_SEATS)).not.toEqual(log.toRow(PACK, 'seven', SEATS));
  });

  it('the log decides the moves: another log gives another row', () => {
    const other = logOf(PASS).toRow(PACK, 'seven', SEATS);
    expect(other).not.toEqual(log.toRow(PACK, 'seven', SEATS));
    expect(other.moves).toEqual([PASS]);
  });

  it('the row is cut at the time: a later append is not in an earlier row', () => {
    const growing = logOf(PASS);
    const earlier = growing.toRow(PACK, 'seven', SEATS);
    growing.append(MOVE);
    expect(earlier.moves).toEqual([PASS]);
    expect(growing.toRow(PACK, 'seven', SEATS)).not.toEqual(earlier);
  });
});
