/**
 * W-PERS — persistence adapter (PC-1 · PC-9 hash-lineage leg · DH-4).
 * Fail-safe direction (SC-4, carried): MISSING OR UNREADABLE STATE IS UNKNOWN, AND
 * UNKNOWN HALTS. A corrupt save is a FLAGGED BREAK, never repaired in place. The save
 * format IS the S-2 row (log-as-truth): {row, finalHash} — on load the row is REPLAYED
 * and the hash compared; a mismatch refuses whole (tamper-evidence by replay).
 * The core is FIXED: this file only calls public engine surfaces.
 */
import type { GameRow } from '@tabletop/engine';

export class PersistHalt extends Error {
  constructor(detail: string) {
    super(`PERSISTENCE HALT [W-PERS/SC-4]: ${detail} — surrendered to the human; nothing was loaded`);
    this.name = 'PersistHalt';
  }
}

export interface SaveEnvelope {
  readonly format: 'tabletop-row-v1';
  readonly row: GameRow;
  readonly finalHash: string;
}

const KEY = 'tabletop.bench.save';

function checkEnvelope(raw: unknown): SaveEnvelope {
  if (typeof raw !== 'object' || raw === null) throw new PersistHalt('save is not an object');
  const e = raw as Partial<SaveEnvelope>;
  if (e.format !== 'tabletop-row-v1') throw new PersistHalt(`unknown save format "${String(e.format)}"`);
  const row = e.row as GameRow | undefined;
  if (
    typeof row !== 'object' || row === null ||
    typeof row.packRef !== 'object' || typeof row.seed !== 'string' ||
    !Array.isArray(row.seats) || !Array.isArray(row.moves)
  ) {
    throw new PersistHalt('row shape invalid (packRef/seed/seats/moves required) — refused whole');
  }
  if (typeof e.finalHash !== 'string' || e.finalHash.length === 0) throw new PersistHalt('missing hash lineage');
  return e as SaveEnvelope;
}

export function exportEnvelope(row: GameRow, finalHash: string): string {
  return JSON.stringify({ format: 'tabletop-row-v1', row, finalHash } satisfies SaveEnvelope, null, 2);
}

/** Import: parse + shape-check; the CALLER must replay and compare the hash before trusting. */
export function importEnvelope(json: string): SaveEnvelope {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new PersistHalt('save is not valid JSON — refused whole');
  }
  return checkEnvelope(raw);
}

export function autosave(storage: Pick<Storage, 'setItem'>, row: GameRow, finalHash: string): void {
  storage.setItem(KEY, exportEnvelope(row, finalHash));
}

/** Load: ABSENT → null (a fresh table is safe); PRESENT-BUT-UNREADABLE → HALT, never partial. */
export function loadAutosave(storage: Pick<Storage, 'getItem'>): SaveEnvelope | null {
  const stored = storage.getItem(KEY);
  if (stored === null) return null; // UNKNOWN-because-absent: nothing to trust, nothing to break
  return importEnvelope(stored); // unreadable/corrupt → PersistHalt inside
}

export function clearAutosave(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(KEY);
}
