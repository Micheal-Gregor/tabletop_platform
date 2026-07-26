/**
 * MR5 ExtensionContract — the platform's growth law (S-7): proposal → per-member
 * obligations (refusal test + vector plan + hook spec) → owner review → repo-time
 * version bump. NEVER mutates a sealed vocabulary at runtime.
 * Traces: S3 F4·MR5 ← S2 MR5 (ODG-2 CLOSED by exercise; history EFX v1.1 → v1.1.1).
 */
import { VOCABULARIES } from './vocabularies.js';
import { EffectRefusal } from '../play/effects.js';

/** The standing docket — reserved names, NOT members (CLAUDE.md §7). */
export const DOCKET = Object.freeze(['spawn_venture', 'draw_card', 'form_relation'] as const);

export interface CycleObligations {
  readonly refusalTest: string;
  readonly vectorPlan: string;
  readonly hookSpec: string;
}

export interface ContractCycle {
  readonly id: string;
  readonly vocabulary: string;
  readonly member: string;
  readonly obligations: CycleObligations;
  readonly status: 'proposed' | 'owner-approved';
  readonly ownerNote?: string;
}

export class ExtensionContract {
  private readonly cycles: ContractCycle[] = [];

  /** GX-23: a proposal without FULL obligations refuses; an existing member refuses. */
  propose(vocabulary: string, member: string, obligations: Partial<CycleObligations>): ContractCycle {
    const vocab = VOCABULARIES.find((v) => v.name === vocabulary);
    if (!vocab) throw new EffectRefusal(member, 'GX-23/S-7', `unknown vocabulary "${vocabulary}"`);
    if (vocab.members.includes(member)) {
      throw new EffectRefusal(member, 'GX-23/S-7', `"${member}" is already a member of ${vocabulary} v${vocab.version}`);
    }
    const missing = (['refusalTest', 'vectorPlan', 'hookSpec'] as const).filter(
      (k) => typeof obligations[k] !== 'string' || obligations[k]!.length === 0
    );
    if (missing.length > 0) {
      throw new EffectRefusal(member, 'GX-23/S-7', `missing per-member obligations: ${missing.join(', ')} — no obligations, no cycle`);
    }
    const cycle: ContractCycle = {
      id: `cycle-${this.cycles.length + 1}`,
      vocabulary,
      member,
      obligations: obligations as CycleObligations,
      status: 'proposed',
    };
    this.cycles.push(cycle);
    return cycle;
  }

  /** Owner approval RECORDS the ruling; the vocabulary itself changes only at a repo-time version bump. */
  approve(cycleId: string, ownerNote: string): ContractCycle {
    const idx = this.cycles.findIndex((c) => c.id === cycleId);
    if (idx < 0) throw new EffectRefusal(cycleId, 'GX-23', 'no such cycle');
    if (!ownerNote) throw new EffectRefusal(cycleId, 'GX-23', 'an approval without an owner note is not a live human decision');
    const approved: ContractCycle = { ...this.cycles[idx]!, status: 'owner-approved', ownerNote };
    this.cycles[idx] = approved;
    return approved;
  }

  record(): readonly ContractCycle[] {
    return [...this.cycles];
  }
}
