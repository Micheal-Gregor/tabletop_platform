import { describe, it, expect } from 'vitest';
import { ExtensionContract, DOCKET, type ContractCycle, type CycleObligations } from '../../packages/engine/src/rules/extension.js';
import { VOCABULARIES } from '../../packages/engine/src/rules/vocabularies.js';
import { EffectRefusal } from '../../packages/engine/src/play/effects.js';

// OS-12 isolation test for ExtensionContract (MOD-19, packages/engine/src/rules/extension.ts).
// Declared inputs: none (the object-model row reads "ExtensionContract: none"). The contract is built with
// nothing and every public operation is called: propose, approve, record (and the DOCKET it seeds).
// propose varies each of its three inputs in turn (vocabulary, member, obligations) and the answers are
// shown to differ; approve varies its cycle id and its owner note; record varies with what was proposed
// and approved. Each refusal is shown to be a typed EffectRefusal naming its rule and its descriptor.
// No environment, clock, globals or network is touched.

const NEW_FX = 'swap_seats';
const NEW_HOOK = 'on-seat-swapped';
const PROPOSE_RULE = 'GX-23/S-7';
const APPROVE_RULE = 'GX-23';
const OBLIGATION_KEYS = ['refusalTest', 'vectorPlan', 'hookSpec'] as const;
const FULL: CycleObligations = {
  refusalTest: 'R-25 refuses the new member',
  vectorPlan: 'V-10 computed from the implementation',
  hookSpec: 'HK-13 before the new member applies',
};

function membersOf(vocabulary: string): readonly string[] {
  return VOCABULARIES.find((v) => v.name === vocabulary)!.members;
}

function refusalOf(run: () => unknown): EffectRefusal {
  try {
    run();
  } catch (e) {
    if (e instanceof EffectRefusal) return e;
    throw e;
  }
  throw new Error('expected a refusal and none was thrown');
}

function freshProposal(vocabulary: string, member: string, obligations: Partial<CycleObligations>): ContractCycle {
  return new ExtensionContract().propose(vocabulary, member, obligations);
}

function withOut(key: keyof CycleObligations): Partial<CycleObligations> {
  return Object.fromEntries(Object.entries(FULL).filter(([k]) => k !== key)) as Partial<CycleObligations>;
}

function twoProposed(): ExtensionContract {
  const contract = new ExtensionContract();
  contract.propose('EFX', NEW_FX, FULL);
  contract.propose('HookPoints', NEW_HOOK, FULL);
  return contract;
}

function statusesOf(contract: ExtensionContract): string[] {
  return contract.record().map((c) => `${c.id}:${c.status}`);
}

describe('ExtensionContract isolation: construction', () => {
  it('is constructed with no input and starts with an empty record', () => {
    expect(new ExtensionContract().record()).toEqual([]);
  });

  it('two contracts do not share what is proposed, and each numbers its own cycles', () => {
    const first = twoProposed();
    const second = new ExtensionContract();
    expect(first.record().length).toBe(2);
    expect(second.record()).toEqual([]);
    expect(second.propose('EFX', NEW_FX, FULL).id).toBe('cycle-1');
    expect(first.record()).not.toEqual(second.record());
  });
});

describe('ExtensionContract isolation: propose answers a proposed cycle', () => {
  it('carries the vocabulary, member and obligations it was given, awaiting the owner', () => {
    const cycle = freshProposal('EFX', NEW_FX, FULL);
    expect(cycle).toEqual({ id: 'cycle-1', vocabulary: 'EFX', member: NEW_FX, obligations: FULL, status: 'proposed' });
    expect('ownerNote' in cycle).toBe(false);
  });

  it.each(['EFX', 'HookPoints', 'VerbSets'])('the vocabulary %s is carried into the cycle', (vocabulary) => {
    expect(freshProposal(vocabulary, NEW_FX, FULL).vocabulary).toBe(vocabulary);
  });

  it('two vocabularies, all else equal, give different cycles', () => {
    const efx = freshProposal('EFX', NEW_FX, FULL);
    const hooks = freshProposal('HookPoints', NEW_FX, FULL);
    expect(efx).not.toEqual(hooks);
  });

  it('two members, all else equal, give different cycles', () => {
    const one = freshProposal('EFX', NEW_FX, FULL);
    const other = freshProposal('EFX', 'swap_hands', FULL);
    expect(one).not.toEqual(other);
    expect([one.member, other.member]).toEqual([NEW_FX, 'swap_hands']);
  });

  it.each(OBLIGATION_KEYS)('two %s obligations, all else equal, give different cycles', (key) => {
    const base = freshProposal('EFX', NEW_FX, FULL);
    const varied = freshProposal('EFX', NEW_FX, { ...FULL, [key]: 'a different obligation' });
    expect(varied.obligations[key]).toBe('a different obligation');
    expect(varied).not.toEqual(base);
  });

  it('the id follows the cycles already proposed in the contract', () => {
    const contract = twoProposed();
    const third = contract.propose('VerbSets', 'shake', FULL);
    expect(contract.record().map((c) => c.id)).toEqual(['cycle-1', 'cycle-2', 'cycle-3']);
    expect(third).not.toEqual(freshProposal('VerbSets', 'shake', FULL));
  });

  it('a refused proposal consumes no id and records nothing', () => {
    const contract = new ExtensionContract();
    refusalOf(() => contract.propose('Nope', NEW_FX, FULL));
    expect(contract.record()).toEqual([]);
    expect(contract.propose('EFX', NEW_FX, FULL).id).toBe('cycle-1');
  });
});

describe('ExtensionContract isolation: the docket is seeded, never a member', () => {
  it('names the three reserved descriptors, frozen', () => {
    expect([...DOCKET]).toEqual(['spawn_venture', 'draw_card', 'form_relation']);
    expect(Object.isFrozen(DOCKET)).toBe(true);
  });

  it.each([...DOCKET])('%s is in no sealed vocabulary, and so may be proposed', (name) => {
    for (const vocabulary of VOCABULARIES) expect(vocabulary.members).not.toContain(name);
    expect(freshProposal('EFX', name, FULL).member).toBe(name);
  });
});

describe('ExtensionContract isolation: propose refuses an unknown vocabulary', () => {
  it('names the rule and the member, and says which vocabulary is unknown', () => {
    const contract = new ExtensionContract();
    const refusal = refusalOf(() => contract.propose('Nope', NEW_FX, FULL));
    expect(refusal.rule).toBe(PROPOSE_RULE);
    expect(refusal.descriptor).toBe(NEW_FX);
    expect(refusal.message).toContain('unknown vocabulary "Nope"');
    expect(contract.record()).toEqual([]);
  });

  it('matches the vocabulary name exactly', () => {
    expect(refusalOf(() => freshProposal('efx', NEW_FX, FULL)).message).toContain('unknown vocabulary "efx"');
    expect(freshProposal('EFX', NEW_FX, FULL).vocabulary).toBe('EFX');
  });

  it('two unknown vocabularies are refused with different messages', () => {
    const one = refusalOf(() => freshProposal('Nope', NEW_FX, FULL));
    const other = refusalOf(() => freshProposal('Nada', NEW_FX, FULL));
    expect(one.message).not.toEqual(other.message);
  });
});

describe('ExtensionContract isolation: propose refuses a member already in the vocabulary', () => {
  it.each(VOCABULARIES.map((v) => [v.name, v.version, v.members[0]!] as const))(
    'a member of %s v%s is refused naming the rule, the member and the version',
    (vocabulary, version, member) => {
      const contract = new ExtensionContract();
      const refusal = refusalOf(() => contract.propose(vocabulary, member, FULL));
      expect(refusal.rule).toBe(PROPOSE_RULE);
      expect(refusal.descriptor).toBe(member);
      expect(refusal.message).toContain(`"${member}" is already a member of ${vocabulary} v${version}`);
      expect(contract.record()).toEqual([]);
    }
  );

  it('the member check follows the vocabulary: a member of one is new to another', () => {
    const verb = membersOf('VerbSets')[0]!;
    expect(membersOf('EFX')).not.toContain(verb);
    expect(refusalOf(() => freshProposal('VerbSets', verb, FULL)).message).toContain('already a member');
    expect(freshProposal('EFX', verb, FULL).member).toBe(verb);
  });
});

describe('ExtensionContract isolation: propose refuses missing obligations', () => {
  it.each(OBLIGATION_KEYS)('a proposal without %s is refused naming it, and registers nothing', (key) => {
    const contract = new ExtensionContract();
    const refusal = refusalOf(() => contract.propose('EFX', NEW_FX, withOut(key)));
    expect(refusal.rule).toBe(PROPOSE_RULE);
    expect(refusal.descriptor).toBe(NEW_FX);
    expect(refusal.message).toContain(`missing per-member obligations: ${key} — no obligations, no cycle`);
    expect(contract.record()).toEqual([]);
  });

  it.each([['an empty string', ''], ['a number', 7], ['null', null]])('%s in place of an obligation counts as missing', (_label, value) => {
    const refusal = refusalOf(() => freshProposal('EFX', NEW_FX, { ...FULL, vectorPlan: value as string }));
    expect(refusal.message).toContain('missing per-member obligations: vectorPlan');
  });

  it('lists every missing obligation, in the order refusalTest, vectorPlan, hookSpec', () => {
    const refusal = refusalOf(() => freshProposal('EFX', NEW_FX, {}));
    expect(refusal.message).toContain('missing per-member obligations: refusalTest, vectorPlan, hookSpec');
  });

  it('a different set missing gives a different message', () => {
    const one = refusalOf(() => freshProposal('EFX', NEW_FX, withOut('hookSpec')));
    const other = refusalOf(() => freshProposal('EFX', NEW_FX, withOut('refusalTest')));
    expect(one.message).not.toEqual(other.message);
  });

  it('is judged after the vocabulary and the member: those refusals answer first', () => {
    const unknown = refusalOf(() => freshProposal('Nope', NEW_FX, {}));
    const existing = refusalOf(() => freshProposal('VerbSets', 'roll', {}));
    expect(unknown.message).toContain('unknown vocabulary');
    expect(existing.message).toContain('already a member');
    expect(unknown.message).not.toContain('missing per-member obligations');
    expect(existing.message).not.toContain('missing per-member obligations');
  });
});

describe('ExtensionContract isolation: approve records the owner ruling', () => {
  it('answers the cycle owner-approved with the note, keeping everything else', () => {
    const contract = twoProposed();
    const approved = contract.approve('cycle-2', 'approved at the v1.2 bump');
    expect(approved).toEqual({
      id: 'cycle-2', vocabulary: 'HookPoints', member: NEW_HOOK, obligations: FULL,
      status: 'owner-approved', ownerNote: 'approved at the v1.2 bump',
    });
  });

  it('two owner notes, all else equal, give different cycles', () => {
    const yes = twoProposed().approve('cycle-1', 'approved');
    const other = twoProposed().approve('cycle-1', 'approved with a caveat');
    expect(yes).not.toEqual(other);
    expect([yes.ownerNote, other.ownerNote]).toEqual(['approved', 'approved with a caveat']);
  });

  it('two cycle ids, all else equal, approve different cycles and leave different records', () => {
    const firstGone = twoProposed();
    const secondGone = twoProposed();
    expect(firstGone.approve('cycle-1', 'ok').member).toBe(NEW_FX);
    expect(secondGone.approve('cycle-2', 'ok').member).toBe(NEW_HOOK);
    expect(statusesOf(firstGone)).toEqual(['cycle-1:owner-approved', 'cycle-2:proposed']);
    expect(statusesOf(secondGone)).toEqual(['cycle-1:proposed', 'cycle-2:owner-approved']);
    expect(statusesOf(firstGone)).not.toEqual(statusesOf(secondGone));
  });

  it('replaces the cycle in place in the record and leaves the cycle propose handed out as it was', () => {
    const contract = new ExtensionContract();
    const proposed = contract.propose('EFX', NEW_FX, FULL);
    const approved = contract.approve(proposed.id, 'ok');
    expect(contract.record()).toEqual([approved]);
    expect(proposed.status).toBe('proposed');
    expect(approved).not.toEqual(proposed);
  });

  it('never changes a sealed vocabulary: the member stays unadmitted and may be proposed again', () => {
    const before = JSON.stringify(VOCABULARIES);
    const contract = new ExtensionContract();
    contract.approve(contract.propose('EFX', NEW_FX, FULL).id, 'ok');
    expect(JSON.stringify(VOCABULARIES)).toBe(before);
    expect(membersOf('EFX')).not.toContain(NEW_FX);
    expect(contract.propose('EFX', NEW_FX, FULL).id).toBe('cycle-2');
  });
});

describe('ExtensionContract isolation: approve refuses what is not a live human decision', () => {
  it('a cycle id that was never proposed is refused naming the rule and the id', () => {
    const contract = twoProposed();
    const refusal = refusalOf(() => contract.approve('cycle-9', 'ok'));
    expect(refusal.rule).toBe(APPROVE_RULE);
    expect(refusal.descriptor).toBe('cycle-9');
    expect(refusal.message).toContain('no such cycle');
    expect(statusesOf(contract)).toEqual(['cycle-1:proposed', 'cycle-2:proposed']);
  });

  it('an empty owner note is refused naming the rule and the id, and the cycle stays proposed', () => {
    const contract = twoProposed();
    const refusal = refusalOf(() => contract.approve('cycle-1', ''));
    expect(refusal.rule).toBe(APPROVE_RULE);
    expect(refusal.descriptor).toBe('cycle-1');
    expect(refusal.message).toContain('an approval without an owner note is not a live human decision');
    expect(statusesOf(contract)).toEqual(['cycle-1:proposed', 'cycle-2:proposed']);
  });

  it('the two refusals differ, and the unknown id answers before the empty note', () => {
    const contract = twoProposed();
    const noCycle = refusalOf(() => contract.approve('cycle-9', ''));
    const noNote = refusalOf(() => contract.approve('cycle-1', ''));
    expect(noCycle.message).toContain('no such cycle');
    expect(noNote.message).not.toContain('no such cycle');
    expect(noCycle.message).not.toEqual(noNote.message);
  });

  it('an approval with a note is accepted where the same call without one is refused', () => {
    const contract = twoProposed();
    expect(() => contract.approve('cycle-1', '')).toThrow(EffectRefusal);
    expect(contract.approve('cycle-1', 'ok').status).toBe('owner-approved');
  });
});

describe('ExtensionContract isolation: record', () => {
  it('follows what was proposed and what was approved', () => {
    const contract = new ExtensionContract();
    const empty = contract.record();
    contract.propose('EFX', NEW_FX, FULL);
    const proposed = contract.record();
    contract.approve('cycle-1', 'ok');
    const approved = contract.record();
    expect([empty.length, proposed.length, approved.length]).toEqual([0, 1, 1]);
    expect(proposed).not.toEqual(empty);
    expect(approved).not.toEqual(proposed);
  });

  it('keeps proposal order, and a different order records differently', () => {
    const forward = twoProposed();
    const backward = new ExtensionContract();
    backward.propose('HookPoints', NEW_HOOK, FULL);
    backward.propose('EFX', NEW_FX, FULL);
    expect(forward.record().map((c) => c.member)).toEqual([NEW_FX, NEW_HOOK]);
    expect(forward.record()).not.toEqual(backward.record());
  });

  it('is a copy: changing what record returned changes nothing held, and later proposals do not reach it', () => {
    const contract = twoProposed();
    const taken = contract.record() as ContractCycle[];
    taken.length = 0;
    expect(contract.record().length).toBe(2);
    const snapshot = contract.record();
    contract.propose('VerbSets', 'shake', FULL);
    expect(snapshot.length).toBe(2);
    expect(contract.record().length).toBe(3);
  });
});
