/**
 * GBC-54 — THE DIE-TILE-PAGE SCENE (feeds V-9; pinned ONLY at the owner's R gate).
 * EP-2 theater-sync across kinds and joins: a seeded die, a placed tile, a booklet
 * page — projected, rendered under the Placeholder Skin, every sync verdict ≡, and the
 * whole scene deterministic across rebuilds.
 */
import { describe, expect, it } from 'vitest';
import {
  a11yAudit,
  beginFlourish,
  bindPlaceholder,
  completeFlourish,
  KIND_CONTRACTS,
  project,
  renderComponent,
  renderJoin,
  renderTable,
} from '../src/index.js';
import { RNGStreams, RuleRegistry, rebuild } from '@tabletop/engine';
import type { EngineCore } from '@tabletop/engine';
import { MIN_REF, minimalGenesis, newMinimalCore, wireMinimal } from '../../engine/tests/f5-fixture.js';

describe('GBC-54 · the die-tile-page scene (feeds V-9)', () => {
  it('displayed ≡ seeded across the die, the tile join, and the page; the scene is deterministic', () => {
    // THE DIE: the seeded truth comes from a named engine stream (GX-5), never the theater
    const seeded = String(new RNGStreams('sigma-7').stream('die:table').nextInt(6) + 1);
    const dieFlourish = beginFlourish('die-throw', seeded, '♪ die throw');
    const dieVerdict = completeFlourish(dieFlourish, seeded); // the animation shows the truth
    expect(dieVerdict.mismatch).toBeNull();
    expect(dieVerdict.result).toBe(seeded);

    // THE TILE: a component rendered and PLACED (a join), under the Placeholder Skin
    const bound = bindPlaceholder([...KIND_CONTRACTS['Die']!, ...KIND_CONTRACTS['Surface']!, ...KIND_CONTRACTS['Card']!]);
    const die = renderComponent('Die', { id: 'd6', label: `die showing ${dieVerdict.result}`, value: dieVerdict.result }, bound);
    const tile = renderJoin('Placement', 'die placed on the table', die);
    expect(tile).toContain(`>${seeded}</text>`); // the DISPLAYED value IS the seeded value

    // THE PAGE: a live mid-game table view (real engine state)
    const { core } = newMinimalCore('sigma-7');
    core.submit({ type: 'upkeep', seat: 'A', args: { overhead: 1 } });
    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } });
    const page = renderTable(project(core.getState(), 'A'), bound);
    expect(a11yAudit(page + tile)).toBe(0); // the floor holds across the whole scene

    // DETERMINISM: rebuild the state, re-project, re-render — byte-identical scene
    const row = core.toRow();
    const wire = (c: EngineCore) => wireMinimal(new RuleRegistry())(c);
    const rebuilt = rebuild(row, minimalGenesis, wire);
    const page2 = renderTable(project(rebuilt.getState(), 'A'), bound);
    expect(page2).toBe(page);
    // and the die re-derives from the same named stream, always
    expect(String(new RNGStreams('sigma-7').stream('die:table').nextInt(6) + 1)).toBe(seeded);
    expect(MIN_REF.id).toBe('MINIMAL'); // the scene rides the anchored fixture
  });
});
