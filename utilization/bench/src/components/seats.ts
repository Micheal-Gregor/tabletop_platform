/**
 * SEATS component (K-A adapter, I-77) — the two-sided SHOP boards (I-65). Wraps the
 * EXISTING pure builders (surfaces.layoutFace/panel) UNCHANGED; builds one board per
 * seat, registers each under its own `seat-i` ladder anchor via ctx.register (so the
 * per-board registration is byte-identical to today's SEATS.forEach loop), and returns
 * null (self-registered). Placement: bound{surface:'table',region:'seat'} (K-A metadata).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { layoutFace, panel } from '../surfaces.js';
import { SHOP_BOARD, BOTY_PACK6 } from '../../../../packs/boty/src/index.js';

const SEATS = BOTY_PACK6.seats.map((s) => s.id);

let cx: PlayAreaContext | null = null;

export const seats: Component = {
  id: 'seats',
  placement: { kind: 'bound', surface: 'table', region: 'seat' },

  build(ctx) {
    cx = ctx;
    const v = ctx.projection();
    const active = v.seats[v.turn.seatIdx]!.id;
    // shop boards standing at the edges — click-to-focus targets. TWO-SIDED (I-65):
    // seats 0-2 near row (+z, the certified A1 placement), seats 3+ far row (−z),
    // each board rotated to face ITS OWN player beyond its table edge.
    SEATS.forEach((s, i) => {
      const seat = v.seats.find((x) => x.id === s)!;
      // A5 (I-128): DATA PARITY with the certified SVG bench's shop fills (game.ts:211) —
      // building-tier carries the crew count, jobs-list the real `crew ⇒ venture`
      // assignments (public per I-59b), AR/AP labels, active-aware actions — all from
      // THE PROJECTION (S-6: never raw state; assignedTo declared at the projector, I-128).
      const crewMine = v.crew.filter((m) => m.outfit === s);
      const jobs = crewMine.filter((m) => m.assignedTo !== undefined).map((m) => `${m.id} ⇒ ${m.assignedTo!.venture}`);
      const b = layoutFace(SHOP_BOARD, 0xffffff, {
        identity: [`${s}${s === active ? ' ★' : ''} · [trade]`],
        counters: [`$${seat.cash} · ♥${seat.favor}`],
        'art-banner': [`${s}'s shop`],
        'building-tier': [`[building · tier — · next increment] · ${crewMine.length} crew`],
        'jobs-list': [jobs.length ? jobs.join(' · ') : 'no jobs in queue'],
        ar: ['AR — owed to you'],
        ap: ['AP — you owe'],
        actions: [s === active ? '' : '—'],
      });
      b.scale.set(2.6, 2.6, 1);
      // L-5 (I-131, owner-ruled): 'each corner seat be moved 45 degrees to the corners
      // of the table' — corners (0,2,3,5) stand at the table's corners yawed ±45° facing
      // their own player; MIDS (1,4) hold their certified poses (seat-1/seat-4 carry the
      // read-pose gate pins — untouched by construction). The seat-front rows, ledger,
      // and hand all DERIVE from the live board bbox, so they follow the corners free.
      const CORNER = 470;
      // L-5b (I-132): the MID seats sit ON THE LINE of the adjacent corner boards'
      // closest edges — 'pulled back… full visibility of table'. DERIVED: a corner
      // board (half-width 130 world) yawed 45° reaches CORNER + 130·sin45° in z.
      const MID_Z = CORNER + 130 * Math.SQRT1_2; // ≈ 562 — the corner near-edge line
      const yawOf = [-Math.PI / 4, 0, Math.PI / 4, Math.PI + Math.PI / 4, Math.PI, Math.PI - Math.PI / 4] as const;
      const posOf: readonly [number, number][] = [
        [-CORNER, CORNER], [0, MID_Z], [CORNER, CORNER],
        [-CORNER, -CORNER], [0, -MID_Z], [CORNER, -CORNER],
      ];
      b.position.set(posOf[i]![0], 130, posOf[i]![1]);
      b.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawOf[i]!)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.25)));
      // the BACK of a seat screen shows ONLY the shop graphic (I-65c) — which shop, no data
      const back = panel(['[shop art]'], 100, 100, s);
      back.rotation.y = Math.PI;
      back.position.z = -0.2;
      back.userData['back'] = s; // never a region — the redaction-consistent shop face
      b.add(back);
      b.userData['seatIdx'] = i;
      ctx.register(b, { anchorKey: `seat-${i}` });
    });
    return null;
  },

  // Phase 2: a board hit → its seat preset (I-65b). seatIdx wins over the accumulated region.
  onPick(ctx, hit: PickInfo) {
    const idx = hit.tags['seatIdx'];
    if (typeof idx === 'number') { ctx.theater.glideTo(`seat-${idx}`); return true; }
    return false;
  },

  gate() {
    const ctx = cx!;
    return {
      seatGroupKeys: () => SEATS.map((_, i) => `seat-${i}`).sort(),
      /** I-65c's contrast surface: seat board i's front data stamp vs its back stamp */
      boardStamps: (i: number) => {
        const grp = ctx.theater.focusObject(`seat-${i}`);
        if (!grp) return null;
        let front: readonly string[] | null = null;
        let back: readonly string[] | null = null;
        grp.traverse((o: THREE.Object3D) => {
          if (o.userData?.['region'] === 'counters' && o.userData?.['renderedLines']) front = o.userData['renderedLines'] as string[];
          if (o.userData?.['back'] && o.userData?.['renderedLines']) back = o.userData['renderedLines'] as string[];
        });
        return { front, back };
      },
      /** K7-A1c D2: the back face must FACE BACKWARD — world-normal dot vs the board front */
      backFacingDot: (i: number) => {
        const grp = ctx.theater.focusObject(`seat-${i}`);
        if (!grp) return null;
        let backMesh: THREE.Object3D | null = null;
        grp.traverse((o: THREE.Object3D) => { if (o.userData?.['back']) backMesh = o; });
        if (!backMesh) return null;
        grp.updateMatrixWorld(true);
        const fq = new THREE.Quaternion();
        grp.getWorldQuaternion(fq);
        const bq = new THREE.Quaternion();
        (backMesh as THREE.Object3D).getWorldQuaternion(bq);
        const fn = new THREE.Vector3(0, 0, 1).applyQuaternion(fq);
        const bn = new THREE.Vector3(0, 0, 1).applyQuaternion(bq);
        return fn.dot(bn);
      },
      /** A5 (I-128) shop-fills oracle: a RENDER-WALK of board i's stamped lines (the
       *  independent read, K7-P D5) vs a FRESH projection derivation — TEXT-equal, so
       *  the check has teeth even at zero crew ('no jobs in queue' MUST be stamped). */
      shopFillsTrue: (i: number) => {
        const grp = ctx.theater.focusObject(`seat-${i}`);
        if (!grp) return null;
        const got: Record<string, string> = {};
        grp.traverse((o: THREE.Object3D) => {
          const rg = o.userData?.['region'] as string | undefined;
          const rl = o.userData?.['renderedLines'] as string[] | undefined;
          if (rg && rl && !o.userData?.['back']) got[rg] = rl.join('|');
        });
        const v = ctx.projection();
        const s = SEATS[i]!;
        const mine = v.crew.filter((m) => m.outfit === s);
        const jobs = mine.filter((m) => m.assignedTo !== undefined).map((m) => `${m.id} ⇒ ${m.assignedTo!.venture}`);
        const wantJobs = jobs.length ? jobs.join(' · ') : 'no jobs in queue';
        const wantTier = `[building · tier — · next increment] · ${mine.length} crew`;
        return {
          got: { tier: got['building-tier'] ?? null, jobs: got['jobs-list'] ?? null, ar: got['ar'] ?? null, ap: got['ap'] ?? null },
          want: { tier: wantTier, jobs: wantJobs },
          match: got['building-tier'] === wantTier && got['jobs-list'] === wantJobs
            && got['ar'] === 'AR — owed to you' && got['ap'] === 'AP — you owe',
        };
      },
      /** L-5 (I-131) oracle: board i's world position + yaw (from its world quaternion —
       *  the corner law is GEOMETRY STATE, never a def echo). */
      boardPose: (i: number) => {
        const grp = ctx.theater.focusObject(`seat-${i}`);
        if (!grp) return null;
        grp.updateWorldMatrix(true, false);
        const p = grp.getWorldPosition(new THREE.Vector3());
        const q = grp.getWorldQuaternion(new THREE.Quaternion());
        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        return { x: p.x, z: p.z, yawDeg: (Math.atan2(n.x, n.z) * 180) / Math.PI };
      },
      /** VG8e's input-drive helper: a board's center projected to canvas pixel coords. */
      boardScreenXY: (i: number) => {
        let hit: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['seatIdx'] === i) hit = o; });
        if (!hit) return null;
        const v = new THREE.Vector3();
        (hit as THREE.Object3D).getWorldPosition(v);
        v.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  },
};
