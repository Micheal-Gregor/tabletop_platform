/**
 * WINDOWS-PROMPT component (A8, I-129; RE-ANCHORED at I-130) — OPEN windows as physical
 * AMBER prompt cards ON THE ONION LAYER: camera-parented, front and center ("Prompts can
 * absolutely exist on an onion layer above the board — that is my preference", owner
 * 2026-08-04). The `windows` table region is GONE (suppressed at the def); the prompt is
 * a transient overlay citizen like the reading board — it occupies no table layout and
 * leaves when decided. Decider law unchanged (I-82/A8, data-local half): your decision →
 * clickable options → `decide {window, option}` through the SAME doors → rebuild; not
 * yours → MUTED + top indicator + 'awaiting {decider}…', options never clickable.
 * Colors stay the SVG's .prompt/.dim as data (#fff8e6/#c90). Without this surface the
 * game soft-locks (crossroads + HK-5 — the W-1 exposure this component closes).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { panelTexture } from '../surfaces.js';
import { camera } from '../stage.js';

let cx: PlayAreaContext | null = null;
let built: { id: string; kind: string; decider: string; mine: boolean; options: readonly string[] }[] = [];
let overlay: THREE.Group | null = null; // I-130: CAMERA-parented (the onion layer) — self-managed, never in builtRoots

const AMBER = 0xfff8e6, AMBER_EDGE = 0xcc9900, MUTED = 0xeae6da; // the SVG .prompt / muted (broadcast law)

export const windowsPrompt: Component = {
  id: 'windows-prompt',
  placement: { kind: 'free', surface: 'overlay' }, // I-130: an onion-layer citizen — no table region

  build(ctx) {
    cx = ctx;
    built = [];
    if (overlay) { camera.remove(overlay); overlay = null; } // the previous overlay leaves with its state (rebuild = fresh truth)
    const v = ctx.projection();
    const open = v.windows.filter((w) => w.status === 'open');
    if (!open.length) return null;
    const grp = new THREE.Group();
    open.forEach((w, i) => {
      const mine = w.decider === ctx.viewSeat;
      built.push({ id: w.id, kind: w.kind, decider: w.decider, mine, options: w.options ?? [] });
      // the prompt CARD: standing upright at the windows region, amber for a live
      // decision, MUTED for not-yours (+ the top indicator line — the broadcast law).
      const card = new THREE.Group();
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 100),
        new THREE.MeshBasicMaterial({ color: mine ? AMBER : MUTED, side: THREE.DoubleSide }),
      );
      face.userData['windowCard'] = w.id;
      card.add(face);
      card.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(90, 100)), new THREE.LineBasicMaterial({ color: mine ? AMBER_EDGE : 0x999999 })));
      const head = new THREE.Mesh(
        new THREE.PlaneGeometry(82, 22),
        new THREE.MeshBasicMaterial({ map: panelTexture(mine ? [w.kind, `decide, ${w.decider}`] : [`◦ ${w.kind}`, `awaiting ${w.decider}…`], 82, 22), transparent: true }),
      );
      head.position.set(0, 34, 0.4);
      head.userData['renderedLines'] = mine ? [w.kind, `decide, ${w.decider}`] : [`◦ ${w.kind}`, `awaiting ${w.decider}…`];
      card.add(head);
      if (mine) {
        (w.options ?? []).forEach((label, oi) => {
          const opt = new THREE.Mesh(
            new THREE.PlaneGeometry(78, 16),
            new THREE.MeshBasicMaterial({ map: panelTexture([label], 78, 16), transparent: true }),
          );
          opt.position.set(0, 12 - oi * 20, 0.4);
          opt.userData = { winId: w.id, optIdx: oi, renderedLines: [label] };
          card.add(opt);
          card.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(78, 16)), new THREE.LineBasicMaterial({ color: 0x888888 })).translateY(opt.position.y).translateZ(0.41));
        });
      }
      // ONION-LAYER pose (I-130): front and center before the camera, fanned by index;
      // every material joins the overlay paint pass (depthTest off, renderOrder 88 —
      // above the whole 3D scene, UNDER an open reading card at 90/92 so a draw's
      // theater still covers a pending prompt until it closes).
      card.traverse((o) => {
        const mat = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; transparent: boolean }) | undefined;
        if (mat && 'opacity' in mat) { mat.transparent = true; mat.depthTest = false; mat.depthWrite = false; o.renderOrder = 88; }
      });
      card.scale.set(0.55, 0.55, 1);
      card.position.set((i - (open.length - 1) / 2) * 60, 0, 2);
      grp.add(card);
    });
    grp.position.z = -130; // the onion's own distance — the same layer, front and center
    overlay = grp;
    camera.add(grp);
    return null; // camera-parented, self-managed (the onion pattern, never builtRoots)
  },

  // Phase 2: an option hit → the decide verb through the doors; rebuild renders truth.
  onPick(ctx, hit: PickInfo) {
    const winId = hit.tags['winId'], optIdx = hit.tags['optIdx'];
    if (typeof winId === 'string' && typeof optIdx === 'number') {
      const w = built.find((b) => b.id === winId);
      if (!w || !w.mine) return false; // never decide what is not yours (the decider law)
      if (ctx.submit('decide', { window: winId, option: optIdx })) {
        ctx.status(`decided: ${w.options[optIdx] ?? optIdx} [${winId}]`);
        ctx.rebuild();
      }
      return true;
    }
    return false;
  },

  gate() {
    const ctx = cx!;
    return {
      /** A8 (I-129) oracle: the RENDERED prompts (walk) vs the fresh projection's open
       *  windows — kind/decider/mine/options text-true; optionScreenXY drives the click. */
      windowPrompts: () => {
        const v = ctx.projection();
        const want = v.windows.filter((w) => w.status === 'open').map((w) => ({ id: w.id, kind: w.kind, decider: w.decider, options: w.options ?? [] }));
        return { rendered: built, want, match: JSON.stringify(built.map((b) => ({ id: b.id, kind: b.kind, decider: b.decider, options: b.options }))) === JSON.stringify(want) };
      },
      windowOptionXY: (winId: string, optIdx: number) => {
        let hit: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['winId'] === winId && o.userData?.['optIdx'] === optIdx) hit = o; });
        if (!hit) return null;
        const p = new THREE.Vector3();
        (hit as THREE.Object3D).getWorldPosition(p);
        ctx.camera.updateMatrixWorld();
        p.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
      },
    };
  },
};
