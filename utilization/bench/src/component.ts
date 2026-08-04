/**
 * COMPONENT — the drop-in Component CONTRACT (K-A of the "drop-in Component
 * architecture", owner-ruled 2026-08-03; I-77). TYPES ONLY + one collision-check
 * helper — this module carries NO object logic and NO runtime scene work. It
 * formalizes ARCHITECTURE.md §PIPELINE v2 into an enforceable seam so a game object
 * becomes ONE adapter module + ONE registry line, the spine untouched.
 *
 * A component is a pure function of (ctx, defs, projection): it reaches the scene,
 * camera, status, and write path ONLY through `PlayAreaContext`. It never imports the
 * spine (game3d.ts), the controller, another component, or (for future pure
 * components) stage.ts/camera.ts — droppability into a future play area is a NEW
 * harness constructing the same ctx over a different engine/projection.
 */
import type * as THREE from 'three';
import type { SeatView } from '@tabletop/presentation';

/**
 * PLACEMENT — a first-class facet (the immersive discipline). Every component declares
 * one; in K-A it is INERT METADATA (each object keeps its current explicit transform),
 * with resolution to a world transform deferred to K-C..E.
 *  - bound  — sits only in a region of a parent surface.
 *  - free   — free to move/tumble anywhere within a surface's WHOLE area.
 *  - pile   — an unbound pile beside a board.
 *  - rests  — rests on top of another object.
 */
export type Placement =
  | { readonly kind: 'bound'; readonly surface: string; readonly region: string }
  | { readonly kind: 'free'; readonly surface: string }
  | { readonly kind: 'pile'; readonly beside: string; readonly side: 'left' | 'right' }
  | { readonly kind: 'rests'; readonly on: string };

/**
 * The portable seam a component may touch. `projection()`/`submit()` are the spine's
 * private `projectNow`/`submitVerb`, exposed via ctx; `register` centralizes the
 * scene.add + builtRoots + focusGroups[anchorKey] ritual; `theater` is the camera/
 * read affordance. `moves()` is the display-only move log (controller.row().moves — the
 * I-52 side-channel the SeatView projection does not carry; the sole seam addition
 * beyond the plan's list, recorded on I-77).
 */
export interface PlayAreaContext {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  projection(): SeatView;
  readonly viewSeat: string;
  status(msg: string): void;
  register(root: THREE.Object3D, opts?: { readonly anchorKey?: string }): void;
  submit(verb: string, args: Record<string, unknown>): boolean;
  rebuild(): void;
  moves(): readonly { readonly seat: string; readonly type: string }[];
  readonly theater: {
    glideTo(name: string): void;
    setLastFocus(f: string): void;
    focusObject(focus: string): THREE.Object3D | null;
    toggleRead(focus?: string): void;
    getMode(): 'scene' | 'read';
  };
}

/**
 * PickInfo — precomputed ONCE per raycast intersection. `tags` = merged userData up the
 * ancestor chain (NEAREST WINS), reproducing today's `while(o)` walk exactly; `region`
 * is the nearest region tag, `focus` the nearest focus tag.
 */
export interface PickInfo {
  readonly object: THREE.Object3D;
  readonly point: THREE.Vector3;
  readonly distance: number;
  readonly region: string | null;
  readonly focus: string | null;
  readonly tags: Record<string, unknown>;
  readonly event: PointerEvent;
}

/**
 * A drop-in component: build once/rebuild, consume overlay clicks, answer a raycast
 * pick, step per frame, and contribute a FLAT `gate()` slice of `__GAME3D__`.
 */
export interface Component {
  readonly id: string;
  /** the ladder anchor key the harness registers the built root under (single-root components). */
  readonly anchorKey?: string;
  /** built ONCE after the first buildScene (not rebuilt on state change); self-adds, never in builtRoots. */
  readonly persistent?: boolean;
  readonly placement: Placement;
  /** returns the root for the harness to register, or null when the component self-registers/self-adds. */
  build(ctx: PlayAreaContext): THREE.Object3D | null;
  /** Phase 0 — overlay closes, in registry order; return true when consumed. */
  consumeClick?(ctx: PlayAreaContext, ev: PointerEvent): boolean;
  /** Phase 2 — one raycast intersection, in registry order; return true to stop. */
  onPick?(ctx: PlayAreaContext, hit: PickInfo): boolean;
  /** CONTRACT v2 (Q-2b, I-91) — THE GRAB PROTOCOL: pointerdown raycast (scene mode only),
   *  in registry order; the FIRST component returning true CLAIMS the drag — the camera
   *  pan/orbit is suppressed and moves/release route here until the pointer lifts. */
  onGrabStart?(ctx: PlayAreaContext, hit: PickInfo): boolean;
  /** pointer moves while this component holds the grab. */
  onGrabMove?(ctx: PlayAreaContext, ev: PointerEvent): void;
  /** the release; return true when the gesture CONSUMED the click (Phase 0/2 skipped). */
  onGrabEnd?(ctx: PlayAreaContext, ev: PointerEvent): boolean;
  /** CONTRACT v3 (S-1, I-103) — THE ABORT: the spine calls this when a live claim cannot
   *  complete normally — a rebuild arrives mid-grab, the pointer CANCELS (touch), or
   *  onGrabEnd THROWS. The component drops its gesture gracefully (settle/glide home);
   *  the fresh build renders truth. Rebuild safety is a PROTOCOL OBLIGATION now, not a
   *  per-component habit (the K7-Q M4 lesson). */
  onGrabAbort?(ctx: PlayAreaContext): void;
  /** per-frame step, in registry order. */
  tick?(ctx: PlayAreaContext, t: number): void;
  /** the component's FLAT __GAME3D__ keys (merged via assignGate). */
  gate(): Record<string, unknown>;
}

/**
 * FLAT-merge a component's gate() into the shared __GAME3D__ surface, THROWING on a key
 * collision — so the 50 gate checks read the SAME flat names (boxProbe/ledgerState/
 * diePhase…) and no two components can silently shadow a surface.
 */
export function assignGate(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const k of Object.keys(source)) {
    if (k in target) throw new Error(`__GAME3D__ gate key collision: "${k}" declared by two components`);
    target[k] = source[k];
  }
}
