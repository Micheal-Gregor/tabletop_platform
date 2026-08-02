/**
 * MP-L LayoutContracts + Camera — the template's VISUAL VOCABULARY (owner-ruled
 * 2026-07-31, I-50). The MtG-frame pattern: a PARENT layout is a declared data
 * contract (roled regions in a 0..100 unit space, optional outline polygon); a CHILD
 * is a data OVERLAY — override/add/suppress with every shadowing DECLARED, never
 * silent; an overlay touching an undeclared region REFUSES named (the contract
 * prevents the game from breaking; the geometry tailors freely — I-48b).
 * The camera is 2.5D SVG (ODG-p1 unchanged): a pure viewBox computation + the
 * table-plane tilt — presentation-local, stateless toward the game (GX-39 family).
 */

export class LayoutRefusal extends Error {
  constructor(readonly layout: string, detail: string) {
    super(`Layout refused [I-50] "${layout}": ${detail}`);
    this.name = 'LayoutRefusal';
  }
}

export interface Region {
  readonly id: string;
  /** what the region IS for — the contract's semantic, not its paint */
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly z?: number;
}

export interface LayoutDef {
  readonly id: string;
  readonly kind: 'card' | 'board' | 'table' | 'panel';
  /** outline polygon in unit space; absent = the full unit rect */
  readonly shape?: readonly (readonly [number, number])[];
  readonly regions: readonly Region[];
  /** the lineage, oldest first — a child always knows its parents */
  readonly lineage: readonly string[];
  /** declared shadowing: what this layout changed vs its parent — QUERYABLE, never silent */
  readonly shadowed: { readonly overridden: readonly string[]; readonly added: readonly string[]; readonly suppressed: readonly string[] };
}

export interface LayoutOverlay {
  readonly id: string;
  readonly shape?: readonly (readonly [number, number])[];
  readonly override?: readonly Region[];
  readonly add?: readonly Region[];
  readonly suppress?: readonly string[];
}

const UNIT = 100;

function checkRegion(layout: string, r: Region): void {
  if (!r.id || !r.role) throw new LayoutRefusal(layout, `region needs id and role, got "${r.id}"/"${r.role}"`);
  for (const [k, val] of Object.entries({ x: r.x, y: r.y, w: r.w, h: r.h })) {
    if (typeof val !== 'number' || !Number.isFinite(val)) throw new LayoutRefusal(layout, `region "${r.id}" ${k} not finite`);
  }
  if (r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0 || r.x + r.w > UNIT || r.y + r.h > UNIT) {
    throw new LayoutRefusal(layout, `region "${r.id}" escapes the unit space (0..${UNIT})`);
  }
}

export function validateLayout(def: LayoutDef): void {
  const seen = new Set<string>();
  for (const r of def.regions) {
    checkRegion(def.id, r);
    if (seen.has(r.id)) throw new LayoutRefusal(def.id, `duplicate region "${r.id}"`);
    seen.add(r.id);
  }
  for (const p of def.shape ?? []) {
    if (p.length !== 2 || p.some((n) => !Number.isFinite(n) || n < 0 || n > UNIT)) {
      throw new LayoutRefusal(def.id, 'shape point escapes the unit space');
    }
  }
  if ((def.shape?.length ?? 3) < 3) throw new LayoutRefusal(def.id, 'a shape needs at least three points');
}

/** THE extension door: child = parent + declared overlay; every shadowing on the record. */
export function extendLayout(parent: LayoutDef, overlay: LayoutOverlay): LayoutDef {
  validateLayout(parent);
  const ids = new Set(parent.regions.map((r) => r.id));
  for (const r of overlay.override ?? []) {
    if (!ids.has(r.id)) throw new LayoutRefusal(overlay.id, `override of undeclared region "${r.id}" — the parent "${parent.id}" never declared it`);
  }
  for (const r of overlay.add ?? []) {
    if (ids.has(r.id)) throw new LayoutRefusal(overlay.id, `added region "${r.id}" collides with the parent's — override it instead`);
  }
  for (const id of overlay.suppress ?? []) {
    if (!ids.has(id)) throw new LayoutRefusal(overlay.id, `suppress of unknown region "${id}"`);
  }
  const overridden = new Map((overlay.override ?? []).map((r) => [r.id, r]));
  const suppressed = new Set(overlay.suppress ?? []);
  const child: LayoutDef = {
    id: overlay.id,
    kind: parent.kind,
    ...(overlay.shape ? { shape: overlay.shape } : parent.shape ? { shape: parent.shape } : {}),
    regions: [
      ...parent.regions.filter((r) => !suppressed.has(r.id)).map((r) => overridden.get(r.id) ?? r),
      ...(overlay.add ?? []),
    ],
    lineage: [...parent.lineage, parent.id],
    shadowed: {
      overridden: [...overridden.keys()],
      added: (overlay.add ?? []).map((r) => r.id),
      suppressed: [...suppressed],
    },
  };
  validateLayout(child);
  return Object.freeze(child);
}

// ── THE PARENT VOCABULARY (data — the template's standard components) ──

/** The parent CARD frame (the MtG-frame pattern): art · title · text · modifiers. */
export const CARD_PARENT: LayoutDef = Object.freeze({
  id: 'template:card',
  kind: 'card',
  regions: [
    { id: 'title', role: 'title', x: 6, y: 4, w: 88, h: 10 },
    { id: 'art', role: 'art', x: 6, y: 16, w: 88, h: 38 },
    { id: 'text', role: 'text', x: 6, y: 57, w: 88, h: 26 },
    { id: 'modifiers', role: 'modifiers', x: 6, y: 86, w: 88, h: 10 },
  ],
  lineage: [],
  shadowed: { overridden: [], added: [], suppressed: [] },
});

/** The parent card BACK: one identity mark — information asymmetry made spatial. */
export const CARD_BACK_PARENT: LayoutDef = Object.freeze({
  id: 'template:card-back',
  kind: 'card',
  regions: [{ id: 'emblem', role: 'emblem', x: 20, y: 30, w: 60, h: 40 }],
  lineage: [],
  shadowed: { overridden: [], added: [], suppressed: [] },
});

/** The parent PLAYER BOARD: crew · equipment · hand anchor · counters · local play. */
export const BOARD_PARENT: LayoutDef = Object.freeze({
  id: 'template:board',
  kind: 'board',
  regions: [
    { id: 'identity', role: 'title', x: 2, y: 2, w: 40, h: 10 },
    { id: 'counters', role: 'counters', x: 56, y: 2, w: 42, h: 10 },
    { id: 'crew', role: 'crew-zone', x: 2, y: 16, w: 30, h: 50 },
    { id: 'equipment', role: 'equipment-rack', x: 34, y: 16, w: 30, h: 50 },
    { id: 'local-play', role: 'play-zone', x: 66, y: 16, w: 32, h: 50 },
    { id: 'hand', role: 'hand-anchor', x: 2, y: 70, w: 96, h: 28 },
  ],
  lineage: [],
  shadowed: { overridden: [], added: [], suppressed: [] },
});

/** The parent TABLETOP: the shared center — deck · discard · dice · windows · global play. */
export const TABLE_PARENT: LayoutDef = Object.freeze({
  id: 'template:table',
  kind: 'table',
  regions: [
    { id: 'deck', role: 'deck', x: 8, y: 38, w: 12, h: 24 },
    { id: 'discard', role: 'discard', x: 24, y: 38, w: 12, h: 24 },
    { id: 'dice', role: 'dice', x: 42, y: 42, w: 16, h: 16, z: 1 },
    { id: 'windows', role: 'prompt-zone', x: 62, y: 34, w: 30, h: 32, z: 2 },
    { id: 'global-play', role: 'play-zone', x: 8, y: 8, w: 84, h: 24 },
  ],
  lineage: [],
  shadowed: { overridden: [], added: [], suppressed: [] },
});

/**
 * The parent REPORT PANEL (I-56a, owner-approved 2026-08-01): a per-player report
 * surface — title · mode tabs · line-item body · total row · footnote. Measured off
 * the owner's Books capture (source 10). A financial statement is not honestly a
 * card, board, or table; the vocabulary says what things ARE.
 */
export const PANEL_PARENT: LayoutDef = Object.freeze({
  id: 'template:panel',
  kind: 'panel',
  regions: [
    { id: 'title', role: 'title', x: 4, y: 4, w: 60, h: 8 },
    { id: 'tabs', role: 'mode-tabs', x: 4, y: 15, w: 92, h: 9 },
    { id: 'body', role: 'line-items', x: 4, y: 28, w: 92, h: 50 },
    { id: 'total', role: 'total', x: 4, y: 80, w: 92, h: 8 },
    { id: 'footnote', role: 'footnote', x: 4, y: 90, w: 92, h: 7 },
  ],
  lineage: [],
  shadowed: { overridden: [], added: [], suppressed: [] },
});

export const PARENT_LAYOUTS: readonly LayoutDef[] = Object.freeze([CARD_PARENT, CARD_BACK_PARENT, BOARD_PARENT, TABLE_PARENT, PANEL_PARENT]);

// ── Rendering (unskinned frames — D-1: space and volume before paint) ──

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function outline(def: LayoutDef): string {
  if (!def.shape) return `<rect width="${UNIT}" height="${UNIT}" rx="4" class="frame"/>`;
  return `<polygon points="${def.shape.map(([x, y]) => `${x},${y}`).join(' ')}" class="frame"/>`;
}

/**
 * Render a layout as an unskinned SVG frame in its unit space: outline + every region
 * as a labeled box (a11y floor: a <title> per element). `content` fills regions by id.
 */
export function renderLayout(def: LayoutDef, label: string, content: Readonly<Record<string, string>> = {}): string {
  validateLayout(def);
  const regions = [...def.regions]
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((r) => {
      const text = content[r.id] ?? `[${r.role}]`;
      return `<g data-region="${esc(r.id)}" data-role="${esc(r.role)}"><title>${esc(label)} · ${esc(r.role)}</title><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" class="region"/><text x="${r.x + 2}" y="${r.y + Math.min(10, r.h - 1)}" class="region-label">${esc(text)}</text></g>`;
    })
    .join('');
  return `<g data-layout="${esc(def.id)}"><title>${esc(label)}</title>${outline(def)}${regions}</g>`;
}

// ── The 2.5D camera (owner-ruled): pure viewBox math + the table-plane tilt ──

export interface Camera {
  readonly cx: number;
  readonly cy: number;
  readonly zoom: number; // 1 = the whole world
}

export interface World {
  readonly w: number;
  readonly h: number;
}

/** Pure: camera → SVG viewBox. Stateless toward the game, always. */
export function cameraViewBox(camera: Camera, world: World): string {
  if (!Number.isFinite(camera.zoom) || camera.zoom < 1) throw new LayoutRefusal('camera', `zoom must be ≥ 1, got ${String(camera.zoom)}`);
  const w = world.w / camera.zoom;
  const h = world.h / camera.zoom;
  const x = Math.min(Math.max(camera.cx - w / 2, 0), world.w - w);
  const y = Math.min(Math.max(camera.cy - h / 2, 0), world.h - h);
  return `${x} ${y} ${w} ${h}`;
}

/** The 2.5D tilt: the table PLANE compresses; standing pieces get their shadow. */
export const TABLE_TILT = 'scale(1 0.62)';
export function shadow(cx: number, cy: number, rx: number): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.35}" class="shadow"/>`;
}

/**
 * Focus presets derived from a seat count: 'table' centers the shared zone; seat i
 * focuses that player's board anchor around the bottom/edges.
 */
export function focusPresets(seatCount: number, world: World): Readonly<Record<string, Camera>> {
  const presets: Record<string, Camera> = {
    table: { cx: world.w / 2, cy: world.h * 0.42, zoom: 1.6 },
    overview: { cx: world.w / 2, cy: world.h / 2, zoom: 1 },
  };
  for (let i = 0; i < seatCount; i++) {
    const t = seatCount === 1 ? 0.5 : i / (seatCount - 1);
    presets[`seat-${i}`] = { cx: world.w * (0.2 + 0.6 * t), cy: world.h * 0.82, zoom: 2.2 };
  }
  return Object.freeze(presets);
}
