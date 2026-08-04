/**
 * CREW-LOOP (A6, I-136) — the v4 working loop's STATE MACHINE + theater, the certified
 * SVG bench's semantics (game.ts:416-422): assigned crew click → WORK; unassigned →
 * toggle SELECT (lift, pure theater); selected + a portion slot → HOP to the slot (real
 * motion, never a teleport) then `assign-crew` submits and the rebuild renders truth.
 * A shared MODULE (the K-A pattern): seat-play routes crew clicks here; the ventures
 * component routes slot clicks. Flourishes (select-lift · assign-hop · work-bounce) are
 * theater data — no seeded truth exists in a lift, so HK-11 is vacuous here.
 */
import * as THREE from 'three';
import type { PlayAreaContext } from './component.js';

const LIFT = 26; // the select lift height (world units) — pure theater
let selected: string | null = null; // the selected crew id (the SVG's selectedCrew)
let liftedMesh: THREE.Object3D | null = null;
let hop: { mesh: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; t: number; crew: string; venture: string; portion: number; submit: (v: string, a: Record<string, unknown>) => boolean; rebuild: () => void } | null = null;
let bounce: { mesh: THREE.Object3D; baseY: number; t: number } | null = null;
let lastHop: { frames: number; dist: number } | null = null;
let lastBounce: { frames: number } | null = null;

export const crewLoopState = () => ({ selected, hopping: hop !== null, bouncing: bounce !== null, lastHop, lastBounce });

/** a rebuild drops the theater — the fresh build renders truth (K7-P D2). */
export function resetCrewLoop(): void {
  hop = null; bounce = null; liftedMesh = null;
  // the SELECTION SURVIVES a rebuild (the SVG's selectedCrew persists across draws) —
  // the fresh crew mesh re-lifts on the next tick via reLift.
}

/** the crew card click (routed from seat-play on a sub-8u release, VIEWER'S OWN crew only). */
export function crewClick(ctx: PlayAreaContext, crew: string, mesh: THREE.Object3D, assigned: boolean): void {
  if (hop) return; // one theater at a time
  if (assigned) {
    // WORK — the verb first, then the fresh card bounces (post-state theater)
    if (ctx.submit('work', { crew })) {
      selected = null;
      ctx.rebuild();
      ctx.status(`${crew} works the job — ⚒`);
      // bounce the REBUILT mesh (found by key on the next tick via requestBounce)
      pendingBounceKey = `crew:${crew}`;
    }
    return;
  }
  if (selected === crew) {
    selected = null; // toggle off — the lift settles on rebuild/tick
    if (liftedMesh) { liftedMesh.position.y -= LIFT; liftedMesh = null; }
    ctx.status(`${crew} set down`);
    return;
  }
  if (liftedMesh) { liftedMesh.position.y -= LIFT; liftedMesh = null; }
  selected = crew;
  mesh.position.y += LIFT; // SELECT-LIFT — pure theater on the live mesh
  liftedMesh = mesh;
  ctx.status(`${crew} selected — click a job's portion slot to assign`);
}

/** the portion-slot click (routed from the ventures component). */
export function slotClick(ctx: PlayAreaContext, venture: string, portion: number, slotWorld: THREE.Vector3, findCrewMesh: (key: string) => THREE.Object3D | null): boolean {
  if (!selected || hop) return false;
  const mesh = findCrewMesh(`crew:${selected}`);
  if (!mesh) return false;
  // ASSIGN-HOP: the card travels to the slot (real motion), THEN the verb submits and
  // the rebuild renders truth — the draw theater's theater-first pattern.
  hop = {
    mesh, from: mesh.position.clone(), to: slotWorld.clone().setY(mesh.position.y),
    t: 0, crew: selected, venture, portion,
    submit: (v, a) => ctx.submit(v, a), rebuild: () => ctx.rebuild(),
  };
  lastHop = { frames: 0, dist: mesh.position.distanceTo(hop.to) };
  ctx.status(`${selected} hops to ${venture} · portion ${portion}`);
  return true;
}

let pendingBounceKey: string | null = null;

/** per-frame: the hop tween → submit at arrival; the bounce; the pending re-lift. */
export function tickCrewLoop(findCrewMesh: (key: string) => THREE.Object3D | null): void {
  if (hop) {
    hop.t = Math.min(1, hop.t + 0.07);
    const e = hop.t * hop.t * (3 - 2 * hop.t);
    const before = hop.mesh.position.clone();
    hop.mesh.position.lerpVectors(hop.from, hop.to, e);
    hop.mesh.position.y = hop.from.y + Math.sin(hop.t * Math.PI) * 34; // the carry arc
    if (lastHop && hop.mesh.position.distanceTo(before) > 1e-6) lastHop.frames++;
    if (hop.t >= 1) {
      const { submit, rebuild, crew, venture, portion } = hop;
      hop = null;
      liftedMesh = null;
      selected = null;
      if (submit('assign-crew', { crew, venture, portion })) rebuild(); // truth renders
      else rebuild(); // a refusal also re-renders — the card returns to its anchor honestly
    }
    return;
  }
  if (pendingBounceKey) {
    const m = findCrewMesh(pendingBounceKey);
    pendingBounceKey = null;
    if (m) { bounce = { mesh: m, baseY: m.position.y, t: 0 }; lastBounce = { frames: 0 }; }
  }
  if (bounce) {
    bounce.t = Math.min(1, bounce.t + 0.09);
    bounce.mesh.position.y = bounce.baseY + Math.abs(Math.sin(bounce.t * Math.PI * 2)) * 18 * (1 - bounce.t); // WORK-BOUNCE, damped
    if (lastBounce) lastBounce.frames++;
    if (bounce.t >= 1) { bounce.mesh.position.y = bounce.baseY; bounce = null; }
    return;
  }
  // the selection survives rebuilds: re-lift the fresh mesh once it exists
  if (selected && !liftedMesh) {
    const m = findCrewMesh(`crew:${selected}`);
    if (m) { m.position.y += LIFT; liftedMesh = m; }
  }
}
