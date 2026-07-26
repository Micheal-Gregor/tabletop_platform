/**
 * M12a Outfit + M12b Crew — seat roles (EX-3) and the one-portion-at-a-time crew law.
 * Traces: S3 F5·M12a/b · CRW. Axiom: GX-28. Viability policies = pack policy args (N/A set).
 */
import type { JsonObject, State } from '../kernel/types.js';
import { VentureRefusal, ventures, completeIfDone } from './ventures.js';

export interface CrewRow extends JsonObject {
  readonly id: string;
  readonly outfit: string;
  readonly assignedTo?: { readonly venture: string; readonly portion: number };
}

export function crewOf(state: State): readonly CrewRow[] {
  return (state['crew'] as readonly CrewRow[]) ?? [];
}

/** GX-28: one crew member, one portion — assigning a busy member refuses. */
export function assignCrew(state: State, crewId: string, ventureId: string, portionIdx: number): JsonObject {
  const member = crewOf(state).find((c) => c.id === crewId);
  if (!member) throw new VentureRefusal(ventureId, 'GX-28', `unknown crew "${crewId}"`);
  if (member.assignedTo !== undefined) {
    throw new VentureRefusal(ventureId, 'GX-28/CRW', `crew "${crewId}" already assigned — one portion at a time`);
  }
  const v = ventures(state).find((x) => x.id === ventureId);
  if (!v || v.status !== 'open') throw new VentureRefusal(ventureId, 'GX-28', 'no open venture');
  const portion = v.portions[portionIdx];
  if (!portion) throw new VentureRefusal(ventureId, 'GX-28', `no portion ${portionIdx}`);
  if (portion.party !== member.outfit) {
    throw new VentureRefusal(ventureId, 'GX-28', `portion belongs to "${portion.party}", not crew's outfit "${member.outfit}"`);
  }
  if (portion.done) throw new VentureRefusal(ventureId, 'GX-28', 'portion already done');
  return {
    ...state,
    crew: crewOf(state).map((c) => (c.id === crewId ? { ...c, assignedTo: { venture: ventureId, portion: portionIdx } } : c)),
  } as JsonObject;
}

/** Work burns exactly one unit; at zero the portion completes and the crew frees. */
export function workCrew(state: State, crewId: string): JsonObject {
  const member = crewOf(state).find((c) => c.id === crewId);
  if (!member?.assignedTo) throw new VentureRefusal(crewId, 'GX-28', 'crew is not assigned — nothing to work');
  const { venture: ventureId, portion: idx } = member.assignedTo;
  const v = ventures(state).find((x) => x.id === ventureId);
  if (!v) throw new VentureRefusal(ventureId, 'GX-28', 'assigned venture vanished');
  const portion = v.portions[idx]!;
  const remaining = portion.work - 1;
  const donePortion = remaining <= 0;
  let next: JsonObject = {
    ...state,
    ventures: ventures(state).map((x) =>
      x.id === ventureId
        ? { ...x, portions: x.portions.map((p, i) => (i === idx ? { ...p, work: Math.max(remaining, 0), done: donePortion || p.done } : p)) }
        : x
    ),
  } as JsonObject;
  if (donePortion) {
    const freed: CrewRow = { id: member.id, outfit: member.outfit };
    next = { ...next, crew: crewOf(next).map((c) => (c.id === crewId ? freed : c)) } as JsonObject;
    next = completeIfDone(next, ventureId);
  }
  return next;
}
