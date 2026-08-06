/**
 * SEAT-PLAY ORACLES (O-2, I-146 — the size-gate extraction, the table-oracles
 * precedent): crewRows · seatRowsInfo · stationBoxInfo · handInfo, moved VERBATIM from
 * seat-play.ts gate() (only the ctx capture is parameterized). No behavior change.
 */
import * as THREE from 'three';
import type { PlayAreaContext } from '../component.js';
import { planPostings, cellLocal } from '../seat-grid.js'; // G-B2 (I-164): the grid law replaces the L-4 planner (I-159 supersession)
import { CARD_FAMILY } from '../../../../packs/boty/src/index.js';
import { STATION_BOX } from '../playarea.js';
import { seatPlayCards, seatFrame, seatPlayLastReturn, seatPlayLastStick } from './seat-play.js';

const seatStickId = (): string | null => { const st = seatPlayLastStick(); return st ? st.id : null; };

export function seatPlayOracles(getCtx: () => PlayAreaContext): Record<string, unknown> {
  const cardsRef = seatPlayCards;
  return {
    seatReturn: seatPlayLastReturn, // I-157: the last bottom-return {id, pile}
    seatStick: seatPlayLastStick, // G-B2 (I-164): the last stuck anchor {id, row, col}
    pairsInfo: () => {
      // G-C2 (I-170): the pair law — every geared crew member (projection truth) has
      // exactly one rendered gear mesh riding its socket; want ≡ got, by name.
      const v = getCtx().projection();
      const want = v.crew.filter((m) => m.gear !== undefined).map((m) => ({ crew: m.id, gear: m.gear }));
      const got = cardsRef().filter((c) => c.key.startsWith('gear:')).map((c) => c.key.slice(5));
      return { want, got, match: want.length === got.length && want.every((w) => got.includes(w.crew)) };
    },
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
        // G-B2 (I-164): the RENDER ≡ planPostings — counts per kind AND every card
        // within 2u of its planned cell in the board's own frame (the grid is the law;
        // a renderer deciding for itself fails BY NAME here). Shape kept for VG8g4.
        const v = getCtx().projection();
        const seat = v.seats[i];
        if (!seat) return null;
        const mine = seat.id === getCtx().viewSeat;
        const session = v.ownDiscard.filter((id) => CARD_FAMILY[id] === 'session');
        const seatCards = [
          ...(mine ? session.map((id) => ({ id, kind: 'bbb' as const })) : []),
          ...v.crew.filter((m) => m.outfit === seat.id).map((m) => ({ id: m.id, kind: 'trades' as const })),
          ...(mine ? seat.assets.map((a, k) => ({ id: `${a.ref}:${k}`, kind: 'equipment' as const })) : []),
        ];
        const plan = planPostings(seatCards); // sticky claims shift anchors, so POSITION checks only bind when no stick is live for the card
        const sf = seatFrame(getCtx(), i);
        const of = (p: string) => cardsRef().filter((c) => c.key.startsWith(p) && c.mesh.userData['focus'] === `seat-${i}`).length;
        const got = { crew: of('crew:'), equipment: of('asset:'), local: of('local:') };
        const want = {
          crew: seatCards.filter((c) => c.kind === 'trades').length,
          equipment: seatCards.filter((c) => c.kind === 'equipment').length,
          local: seatCards.filter((c) => c.kind === 'bbb').length,
        };
        let posed = true;
        if (sf) {
          for (const c of seatCards) {
            const cell = plan.get(c.id);
            const card = cardsRef().find((k) => k.key.endsWith(`:${c.id}`) && k.mesh.userData['focus'] === `seat-${i}`);
            if (!cell || !card) continue;
            if ((seatStickId() === c.id)) continue; // a stuck card owns its own anchor
            const lc = cellLocal(cell.row, cell.col);
            const wantPos = sf.c.clone().addScaledVector(sf.lat, lc.lat).addScaledVector(sf.n, 60 + lc.out);
            if (Math.hypot(card.mesh.position.x - wantPos.x, card.mesh.position.z - wantPos.z) > 2) posed = false;
          }
        }
        return { got, match: got.crew === want.crew && got.equipment === want.equipment && got.local === want.local && posed };
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
      handInfo: () => ({
        // C-1a (I-149): the staged hand RETIRED (it duplicated in-play instances);
        // want ≡ got ≡ 0 until the REAL networking hand lands at C-1d.
        count: cardsRef().filter((c) => (c.mesh.userData as Record<string, unknown>)['hand']).length,
        belowBooks: true,
        want: 0,
      }),
  };
}
