import { expect } from 'vitest';

// The shared OS-12 checks for a refusal class (an Error subclass built from declared inputs).
// A refusal's isolation test declares a RefusalSpec and calls these; nothing here is copied
// into a test body. No environment, clock, globals or network is touched.

export type ErrorClass = abstract new (...args: never[]) => Error;

export interface RefusalSpec<I extends object> {
  /** The refusal class itself, for the typed throw/catch check. */
  readonly type: ErrorClass;
  /** The fixed name every instance carries, whatever it was built from. */
  readonly typeName: string;
  /** Builds the refusal from its declared inputs and nothing else. */
  readonly build: (inputs: I) => Error;
  /** One full set of declared inputs. */
  readonly base: I;
  /** For each declared input, `base` with that input alone changed. */
  readonly variants: { readonly [K in keyof I]: I };
  /** The message the inputs must produce. */
  readonly messageOf: (inputs: I) => string;
  /** The public fields (beyond name, message, stack) the inputs must produce. */
  readonly fieldsOf: (inputs: I) => Readonly<Record<string, unknown>>;
}

function declaredInputs<I extends object>(spec: RefusalSpec<I>): (keyof I & string)[] {
  return Object.keys(spec.base) as (keyof I & string)[];
}

function allInputSets<I extends object>(spec: RefusalSpec<I>): I[] {
  return [spec.base, ...declaredInputs(spec).map((input) => spec.variants[input])];
}

function caughtBy(raise: () => never): Error {
  try {
    raise();
  } catch (error) {
    return error as Error;
  }
  throw new Error('the refusal was built but never thrown');
}

/** The test's own table is sound: each variant differs from base in its one input and no other. */
export function checkVariantsDifferInOneInput<I extends object>(spec: RefusalSpec<I>): void {
  const inputs = declaredInputs(spec);
  for (const input of inputs) {
    const variant = spec.variants[input];
    expect(variant[input], `variant of ${input}`).not.toEqual(spec.base[input]);
    for (const other of inputs.filter((name) => name !== input)) {
      expect(variant[other], `variant of ${input} must keep ${other}`).toEqual(spec.base[other]);
    }
  }
}

/** Constructed from its declared inputs alone, it is an Error of the declared type with the declared message. */
export function checkConstructed<I extends object>(spec: RefusalSpec<I>): void {
  const refusal = spec.build(spec.base);
  expect(refusal).toBeInstanceOf(Error);
  expect(refusal).toBeInstanceOf(spec.type);
  expect(refusal.message).toBe(spec.messageOf(spec.base));
}

/** Every public field is read and answers from the inputs it was built from. */
export function checkFieldsRead<I extends object>(spec: RefusalSpec<I>): void {
  for (const inputs of allInputSets(spec)) {
    const refusal = spec.build(inputs) as unknown as Record<string, unknown>;
    for (const [field, expected] of Object.entries(spec.fieldsOf(inputs))) {
      expect(refusal[field], `field ${field}`).toEqual(expected);
    }
  }
}

/** The name is fixed: no declared input moves it. */
export function checkNameFixed<I extends object>(spec: RefusalSpec<I>): void {
  for (const inputs of allInputSets(spec)) {
    expect(spec.build(inputs).name).toBe(spec.typeName);
  }
}

/** For each declared input, two constructions differing only there give different messages. */
export function checkMessageFollowsEachInput<I extends object>(spec: RefusalSpec<I>): void {
  const base = spec.build(spec.base).message;
  for (const input of declaredInputs(spec)) {
    const varied = spec.build(spec.variants[input]);
    expect(varied.message, `input ${input}`).not.toBe(base);
    expect(varied.message, `input ${input}`).toBe(spec.messageOf(spec.variants[input]));
  }
}

/** The same inputs twice give the same message and name: nothing but the inputs varies the answer. */
export function checkSameInputsSameAnswer<I extends object>(spec: RefusalSpec<I>): void {
  const first = spec.build(spec.base);
  const second = spec.build(spec.base);
  expect(first.message).toBe(second.message);
  expect(first.name).toBe(second.name);
}

/** The stack is read: it carries the message, so it follows every declared input too. */
export function checkStackFollowsEachInput<I extends object>(spec: RefusalSpec<I>): void {
  const base = String(spec.build(spec.base).stack);
  expect(base).toContain(spec.messageOf(spec.base));
  for (const input of declaredInputs(spec)) {
    const varied = String(spec.build(spec.variants[input]).stack);
    expect(varied, `input ${input}`).not.toBe(base);
    expect(varied).toContain(spec.messageOf(spec.variants[input]));
  }
}

/** Thrown, it is caught as its own type, so a caller can tell it from a broken call. */
export function checkThrowsTyped<I extends object>(spec: RefusalSpec<I>): void {
  const raise = (): never => {
    throw spec.build(spec.base);
  };
  expect(raise).toThrow(spec.messageOf(spec.base));
  const caught = caughtBy(raise);
  expect(caught).toBeInstanceOf(spec.type);
  expect(caught.name).toBe(spec.typeName);
}

/** One shared check, runnable against any refusal's spec. */
export type RefusalCheck = <I extends object>(spec: RefusalSpec<I>) => void;

/**
 * Every check above, each with the sentence a test reports it under, in the order a refusal
 * class is read. A refusal's isolation test runs this table with `it.each`, so no test body
 * repeats another's list of calls.
 */
export const REFUSAL_CHECKS: [string, RefusalCheck][] = [
  ['each variant differs from the base in its one input only', checkVariantsDifferInOneInput],
  ['builds an Error of its own type with the message its inputs give', checkConstructed],
  ['gives the same message and name for the same inputs twice', checkSameInputsSameAnswer],
  ['every public field answers from its own declared input', checkFieldsRead],
  ['name stays fixed whatever declared input it is built from', checkNameFixed],
  ['message changes with each declared input', checkMessageFollowsEachInput],
  ['stack carries the message, so each declared input changes it', checkStackFollowsEachInput],
  ['is caught by its own type, not as a broken call', checkThrowsTyped],
];
