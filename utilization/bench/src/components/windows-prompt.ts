/**
 * WINDOWS-PROMPT component (A8, I-129) — OPEN windows as physical AMBER prompt cards at
 * the `windows` table region (the certified SVG anatomy, game.ts:127-132). The decider
 * law (I-82/A8 broadcast law, data-local half): your decision → clickable options →
 * `decide {window, option}` through the SAME doors (emit → window:resolve, a REAL verb)
 * → rebuild; not your decision → MUTED card + top indicator + 'awaiting {decider}…',
 * options never clickable. Colors are the SVG's .prompt/.dim as data (#fff8e6/#c90).
 * Without this surface the game soft-locks: crossroads opens a gated window and HK-5
 * refuses end-turn until it is decided (the W-1 exposure this component closes).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { panelTexture } from '../surfaces.js';
import { TOWN_TABLE_V2 } from '../../../../packs/boty/src/index.js';

let cx: PlayAreaContext | null = null;
let built: { id: string; kind: string; decider: string; mine: boolean; options: readonly string[] }[] = [];

const AMBER = 0xfff8e6, AMBER_EDGE = 0xcc9900, MUTED = 0xeae6da; // the SVG .prompt / muted (broadcast law)

export const windowsPrompt: Component = {
  id: 'windows-prompt',
  placement: { kind: 'bound', surface: 'table', region: 'windows' },

  build(ctx) {
    cx = ctx;
    built = [];
    const v = ctx.projection();
    const open = v.windows.filter((w) => w.status === 'open');
    if (!open.length) return null;
    const wr = TOWN_TABLE_V2.regions.find((r) => r.id === 'windows')!;
    const t = ctx.theater.focusObject('table');
    if (!t) return null;
    t.updateWorldMatrix(true, true);
    const tb = new THREE.Box3().setFromObject(t);
    const sx = (tb.max.x - tb.min.x) / 100, sz = (tb.max.z - tb.min.z) / 100;
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
      // world pose: standing at the region, tilted like a table tent, fanned by index
      card.scale.set(1.6, 1.6, 1);
      card.position.set(
        tb.min.x + (wr.x + wr.w / 2) * sx + i * 40,
        tb.max.y + 78,
        tb.min.z + (wr.y + wr.h / 2) * sz,
      );
      card.rotation.x = -0.35;
      grp.add(card);
    });
    ctx.register(grp);
    return null; // self-registered
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
