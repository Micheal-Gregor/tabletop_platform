/**
 * M16 Transport — the self-contained lockstep controller (AE-c6-CF shape).
 * Traces: S3 F7 · SUP-1 · S-2 seam ONLY (the row contract + the hosted core's public
 * surface). Axioms: GX-31 (the row is the session; packRef mismatch refuses WHOLE),
 * GX-32 (writer discipline; the row heals; host submits for AI seats).
 * Consumer interface: subscribe · submit · resume (+ presence: join/leave/takeover).
 * Network/realtime infrastructure, host election, presence timeouts = production
 * concerns (S3 §8). UX orchestration is OUT-OF-PLATFORM.
 */
import type { GameRow, Genesis, Intent, PackRef, Refusal, Seat } from '../kernel/types.js';
import { EngineCore, rebuild } from '../kernel/core.js';
import type { SubmitResult } from '../kernel/core.js';

export class TransportRefusal extends Error {
  constructor(readonly rule: string, detail: string) {
    super(`Transport refused [${rule}]: ${detail}`);
    this.name = 'TransportRefusal';
  }
}

/** Each appended move, in order, with its index and the post-move state hash. */
export type MoveListener = (move: Intent, index: number, stateHash: string) => void;

export class LockstepController {
  private readonly listeners = new Set<MoveListener>();
  /** seat id → holding client id. GX-32: only the holder writes for a seat. */
  private readonly holders = new Map<string, string>();
  private readonly present = new Set<string>();

  private constructor(
    private readonly core: EngineCore,
    private readonly seats: readonly Seat[]
  ) {}

  /** Host a fresh session (the live-game path). */
  static host(
    packRef: PackRef,
    seats: readonly Seat[],
    seed: string,
    genesis: Genesis,
    wire: (core: EngineCore) => void
  ): LockstepController {
    const core = new EngineCore(packRef, seats, seed, genesis);
    wire(core);
    return new LockstepController(core, seats);
  }

  /**
   * Resume/self-heal (GX-31/SUP-1/GBC-42): rebuild from the row — but a packRef that
   * does not match the loaded pack in id, version, OR hash is a DIVERGENCE, refused
   * WHOLE with the mismatching leg NAMED. Never a partial adoption (R-9).
   */
  static resume(
    row: GameRow,
    loadedPackRef: PackRef,
    genesis: Genesis,
    wire: (core: EngineCore) => void
  ): LockstepController {
    if (row.packRef.id !== loadedPackRef.id) {
      throw new TransportRefusal('GX-31/SUP-1', `packRef ID mismatch: row "${row.packRef.id}" vs loaded "${loadedPackRef.id}" — divergence, refused whole`);
    }
    if (row.packRef.version !== loadedPackRef.version) {
      throw new TransportRefusal('GX-31/SUP-1', `packRef VERSION mismatch: row "${row.packRef.version}" vs loaded "${loadedPackRef.version}" — divergence, refused whole`);
    }
    if (row.packRef.hash !== loadedPackRef.hash) {
      throw new TransportRefusal('GX-31/SUP-1', `packRef HASH mismatch: row "${row.packRef.hash}" vs loaded "${loadedPackRef.hash}" — divergence, refused whole`);
    }
    const core = rebuild(row, genesis, wire); // R-9: any mid-replay refusal throws DivergenceError
    return new LockstepController(core, row.seats);
  }

  /**
   * Presence (GX-32): a client takes a seat. A seat held by a PRESENT client cannot be
   * taken; a departed holder's seat is takeover-eligible. One client may hold several
   * seats (the host holds every AI seat — auto-parity: their moves are logged intents).
   */
  join(clientId: string, seat: string): void {
    if (!this.seats.some((s) => s.id === seat)) {
      throw new TransportRefusal('GX-32', `unknown seat "${seat}"`);
    }
    const holder = this.holders.get(seat);
    if (holder !== undefined && holder !== clientId && this.present.has(holder)) {
      throw new TransportRefusal('GX-32', `seat "${seat}" is held by a present client — takeover requires the holder's departure`);
    }
    this.holders.set(seat, clientId);
    this.present.add(clientId);
  }

  /** Departure: seats stay mapped (the client may rejoin) but become takeover-eligible. */
  leave(clientId: string): void {
    this.present.delete(clientId);
  }

  /** Explicit takeover of a departed holder's seat — same law as join, named for the interface. */
  takeover(clientId: string, seat: string): void {
    this.join(clientId, seat);
  }

  /**
   * THE write path (GX-31/GX-32): writer discipline first — a client submits only for a
   * seat it holds (typed refusal, NEVER logged) — then the hosted core's guarded path.
   * Every logged move fans out to every subscriber in append order.
   */
  submit(clientId: string, intent: Intent): SubmitResult {
    if (this.holders.get(intent.seat) !== clientId) {
      const refusal: Refusal = {
        refused: true,
        code: 'RULE_REFUSED',
        rule: 'GX-32/writer',
        detail: `client "${clientId}" does not hold seat "${intent.seat}" — writer discipline`,
      };
      return refusal;
    }
    const before = this.core.getLogLength();
    const result = this.core.submit(intent);
    if (this.core.getLogLength() > before) {
      const hash = this.core.getStateHash();
      for (const l of this.listeners) l(intent, before, hash);
    }
    return result;
  }

  /** Lockstep fan-out: every subscriber sees the same ordered moves. Returns unsubscribe. */
  subscribe(listener: MoveListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The S-2 row — the session's sole persistent truth. */
  row(): GameRow {
    return this.core.toRow();
  }

  stateHash(): string {
    return this.core.getStateHash();
  }

  holderOf(seat: string): string | undefined {
    return this.holders.get(seat);
  }
}
