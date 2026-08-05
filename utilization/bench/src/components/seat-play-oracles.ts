/**
 * SEAT-PLAY ORACLES (O-2, I-146 — the size-gate extraction, the table-oracles
 * precedent): crewRows · seatRowsInfo · stationBoxInfo · handInfo, moved VERBATIM from
 * seat-play.ts gate() (only the ctx capture is parameterized). No behavior change.
 */
import * as THREE from 'three';
import type { PlayAreaContext } from '../component.js';
import { planSeatRows } from '../seat-rows.js';
import { CARD_FAMILY } from '../../../../packs/boty/src/index.js';
import { STATION_BOX } from '../playarea.js';
import { seatPlayCards, seatFrame } from './seat-play.js';

export function seatPlayOracles(getCtx: () => PlayAreaContext): Record<string, unknown> {
  const cardsRef = seatPlayCards;
  return {
      /** count-true crew rows: per seat — want (projection) vs got (meshes) + in-front. */
      crewRows: () => {
        const v = getCtx().projection();
        return v.seats.map((s, i) => {
          const want = v.crew.filter((m) => m.outfit === s.id).length;
          const got = cardsRef().filter((c) => c.key.startsWith('crew:') && c.mesh.userData['focus'] === `seat-${i}`).length;
          const sf = seatFrame(getCtx(), i);
          const row = cardsRef().find((c) => c.key.startsWith('crew:') && c.mesh.userData['focus'] === `seat-${i}`);
          // I-144 (supersedes the L-5b table-side law): the rows live BEHIND the board
          // (the PLAYER side) — the offset along the board normal is POSITIVE.
          const inFront = !!(row && sf) && row.mesh.position.clone().sub(sf.c).dot(sf.n) > 0;
          return { seat: s.id, want, got, inFront };
        });
      },
      assetsCount: () => {
        const v = getCtx().projection();
        const want = v.seats.find((s) => s.id === getCtx().viewSeat)?.assets.length ?? 0;
        return { want, got: cardsRef().filter((c) => c.key.startsWith('asset:')).length };
      },
      /** L-4 (I-131) oracles: the PLAN vs the RENDER for a seat (row kinds/counts/
       *  overlap ≡ meshes by key prefix), and the hand's below-the-books geometry. */
      seatRowsInfo: (i: number) => {
        const v = getCtx().projection();
        const seat = v.seats[i];
        if (!seat) return null;
        const mine = seat.id === getCtx().viewSeat;
        const session = v.ownDiscard.filter((id) => CARD_FAMILY[id] === 'session');
        const plan = planSeatRows(
          v.crew.filter((m) => m.outfit === seat.id).map((m) => ({ id: m.id, paired: false })),
          mine ? seat.assets.map((a, k) => ({ id: `${a.ref}:${k}` })) : [],
          mine ? session.map((id) => ({ id })) : [],
        );
        const of = (p: string) => cardsRef().filter((c) => c.key.startsWith(p) && c.mesh.userData['focus'] === `seat-${i}` && !c.mesh.userData['hand']).length;
        return {
          plan: plan.map((r) => ({ kind: r.kind, n: r.items.length, overlap: r.overlap })),
          got: { crew: of('crew:'), equipment: of('asset:'), local: of('local:') },
          match: plan.filter((r) => r.kind === 'trades').reduce((a, r) => a + r.items.length, 0) === of('crew:')
            && plan.filter((r) => r.kind === 'equipment').reduce((a, r) => a + r.items.length, 0) === of('asset:')
            && plan.filter((r) => r.kind === 'local').reduce((a, r) => a + r.items.length, 0) === of('local:'),
        };
      },
      /** O-2 (I-146): the STATION BOX containment — every seat-0 station mesh's centre
       *  inside the box rect (frame-relative). KILL: move any offset out → fails. */
      stationBoxInfo: () => {
        const sf = seatFrame(getCtx(), 0);
        if (!sf) return null;
        const mine = cardsRef().filter((c) => c.mesh.userData['focus'] === 'seat-0');
        const out: string[] = [];
        for (const c of mine) {
          const rel = c.mesh.position.clone().sub(sf.c);
          const lat = rel.dot(sf.lat), depth = rel.dot(sf.n);
          if (Math.abs(lat) > STATION_BOX.halfW + 1 || depth < -5 || depth > STATION_BOX.depth + 5) out.push(`${c.key}@lat${lat.toFixed(0)}/d${depth.toFixed(0)}`);
        }
        return { checked: mine.length, outside: out, contained: out.length === 0, box: STATION_BOX };
      },
      handInfo: () => {
        const hand = cardsRef().filter((c) => c.mesh.userData['hand']);
        const ledger = getCtx().theater.focusObject('ledger');
        const sf = seatFrame(getCtx(), 0); // the viewer's seat frame
        if (!ledger || !sf) return { count: hand.length, belowBooks: false };
        const lc = new THREE.Box3().setFromObject(ledger).getCenter(new THREE.Vector3());
        // L-5b (I-132): below the books = a POSITIVE step along the seat frame's normal
        // (away from the table) from the ledger — frame-relative, corner-safe.
        const belowBooks = hand.length === 0 || hand.every((c) => c.mesh.position.clone().sub(lc).dot(sf.n) > 0);
        return { count: hand.length, belowBooks, want: Math.min(3, getCtx().projection().ownDiscard.length) };
      },
  };
}
