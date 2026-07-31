/**
 * F6 base cases GBC-48..53 — projection/redaction (R-19), skin law (R-21/R-22, D-1),
 * emission (R-23), theater (R-20, D-2), render + a11y floor, the two clocks.
 * Engine states come from the MINIMAL fixture through the REAL engine (S-6 exercised).
 */
import { describe, expect, it } from 'vitest';
import {
  EmissionRefusal,
  ProjectionBreach,
  SkinRefusal,
  Timeline,
  UnboxRefusal,
  a11yAudit,
  bind,
  bindPlaceholder,
  beginFlourish,
  completeFlourish,
  displayClock,
  emit,
  hookHk10BeforeRenderRead,
  KIND_CONTRACTS,
  placeholderSkin,
  project,
  renderBooklet,
  renderComponent,
  renderJoin,
  renderTable,
  tickCaptions,
  unbox,
} from '../src/index.js';
import { renderRuleset, RuleRegistry } from '@tabletop/engine';
import type { State } from '@tabletop/engine';
import { newMinimalCore } from '../../engine/tests/f5-fixture.js';

/** A real mid-game state: A spawned an unassigned venture → a gated routing window is OPEN. */
function midGame() {
  const { core, registry } = newMinimalCore('f6');
  core.submit({ type: 'upkeep', seat: 'A', args: { overhead: 1 } });
  core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } });
  core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
  return { core, registry, state: core.getState() };
}

describe('GBC-48 · projection: redacted, branded, frozen (GX-35 = R-19)', () => {
  it("opponent deck CONTENTS are absent (counts only); window options are decider-only; the view is frozen", () => {
    const { state } = midGame();
    const asB = project(state, 'B');
    expect(asB.decks['A']!.drawCount).toBe(1); // count present
    expect(JSON.stringify(asB)).not.toContain('K1'); // A's remaining card NEVER in B's view
    const win = asB.windows.find((w) => w.status === 'open')!;
    expect(win.options).toBeNull(); // B is not the decider
    const asA = project(state, 'A');
    expect(project(state, 'A').windows.find((w) => w.status === 'open')!.options).toEqual(['route V', 'decline']);
    expect(() => { (asA as { seat: string }).seat = 'B'; }).toThrow(); // frozen
    expect(() => project(state, 'GHOST')).toThrow(ProjectionBreach);
  });

  it('R-19: a renderer handed RAW STATE refuses (projection breach); the projected view renders', () => {
    const { state } = midGame();
    expect(() => renderTable(state as never, bindPlaceholder(KIND_CONTRACTS['Card']!))).toThrow(ProjectionBreach);
    expect(() => hookHk10BeforeRenderRead({ seat: 'A' })).toThrow(ProjectionBreach);
    const svg = renderTable(project(state, 'A'), bindPlaceholder(KIND_CONTRACTS['Card']!));
    expect(svg).toContain('data-seat-view="A"');
  });

  it('unbox: OWN discard-top reveals; another seat\'s refuses (validated reveal)', () => {
    const { state } = midGame();
    expect(unbox(project(state, 'A'), 'discard-top', 'A')).toBe('K2'); // A drew K2
    expect(() => unbox(project(state, 'B'), 'discard-top', 'A')).toThrow(UnboxRefusal);
  });
});

describe('GBC-49 · the skin law (GX-36 = R-21/R-22; D-1)', () => {
  it('R-21: missing tokens refuse, NAMED; R-22: a raw value in a contract refuses', () => {
    expect(() => bind({ 'card.face': 'x' }, KIND_CONTRACTS['Card']!)).toThrow(SkinRefusal);
    expect(() => bind({ 'card.face': 'x' }, KIND_CONTRACTS['Card']!)).toThrow(/card\.back, sound\.card-flip/);
    for (const raw of ['#ff0000', 'flip.png', 'CARD.FACE', 'no-namespace', 'file:///x']) {
      expect(() => bind({}, [raw])).toThrow(/raw value|not a token/);
    }
  });

  it('D-1: the Placeholder Skin binds ANY contract completely — frames before assets', () => {
    for (const contract of Object.values(KIND_CONTRACTS)) {
      expect(() => bindPlaceholder(contract)).not.toThrow();
    }
    const skin = placeholderSkin(KIND_CONTRACTS['Card']!);
    expect(skin['card.face']).toBe('[card.face]'); // the alt-text IS the frame
    expect(skin['sound.card-flip']).toBe('♪ card flip'); // sounds become captions
  });
});

describe('GBC-50 · emission (GX-37 = R-23): verbs → intents the ENGINE accepts', () => {
  it('each emitted intent is pure data and drives core.submit legally', () => {
    const { core } = midGame();
    const decide = emit('decide', 'A', { window: 'w1', option: 0 });
    expect(decide).toEqual({ type: 'window:resolve', seat: 'A', args: { window: 'w1', option: 0 } });
    expect('refused' in core.submit(decide)).toBe(false); // the real engine takes it
    const end = emit('end-turn', 'A');
    expect('refused' in core.submit(end)).toBe(false);
    expect(() => emit('cast-fireball', 'A')).toThrow(EmissionRefusal); // closed map
    expect(() => emit('draw', '')).toThrow(/seat required/);
  });

  it('K7-F6 D1: a NON-INTENT emission refuses typed AT THE DOOR — nested functions/thenables never cross the seam', () => {
    expect(() => emit('draw', 'A', { deck: () => 'evil' })).toThrow(EmissionRefusal);
    expect(() => emit('draw', 'A', { deck: { then: () => 'thenable' } })).toThrow(EmissionRefusal);
    expect(() => emit('spawn-venture', 'A', { spec: { id: 'V', hidden: { deep: [Symbol('x')] } } })).toThrow(EmissionRefusal);
    // and the clone severs aliasing: mutating the caller's args cannot tamper the emitted intent
    const args = { deck: 'A' };
    const intent = emit('draw', 'A', args);
    args.deck = 'TAMPERED';
    expect(intent.args['deck']).toBe('A');
  });
});

describe('GBC-51 · theater over truth (GX-38 = R-20; D-2)', () => {
  it('matching completion → no flag; mismatch → FLAGGED and the SEEDED result wins', () => {
    const inst = beginFlourish('die-throw', '4', '♪ die throw');
    expect(completeFlourish(inst, '4')).toEqual({ result: '4', mismatch: null });
    const bad = completeFlourish(inst, '6'); // the animation lied
    expect(bad.result).toBe('4'); // TRUTH WINS
    expect(bad.mismatch).toEqual({ flagged: true, displayed: '6', seeded: '4' });
  });

  it('D-1/D-2: the sound caption self-removes after its ttl; unknown flourish refuses', () => {
    const inst = beginFlourish('card-flip', 'K2', '♪ card flip');
    expect(inst.captions.length).toBe(1);
    const later = tickCaptions(inst.captions, 400);
    expect(later.length).toBe(1); // still up, briefly
    expect(tickCaptions(later, 10_000).length).toBe(0); // gone — self-removed
    expect(() => beginFlourish('explosion', 'x', 'boom')).toThrow(/unknown flourish/);
  });
});

describe('GBC-52 · render: tokens-only + the a11y floor (GX-36/GX-39)', () => {
  it('component SVG carries the BOUND token values and a <title> per element; the booklet lists every rule', () => {
    const bound = bindPlaceholder(KIND_CONTRACTS['Card']!);
    const svg = renderComponent('Card', { id: 'K2', label: 'venture card K2' }, bound);
    expect(svg).toContain('[card.face]');
    expect(svg).toContain('<title>venture card K2</title>');
    expect(a11yAudit(svg)).toBe(0); // the floor
    const join = renderJoin('Placement', 'K2 on the table', svg);
    expect(join).toContain('data-join="Placement"');
    expect(a11yAudit(join)).toBe(0);
    // the booklet renders the REAL F4 view model
    const registry = new RuleRegistry();
    registry.register({ id: 'house-rule', bearer: { kind: 'Card' }, trigger: 'on-round-wrap', condition: { op: 'always' }, effects: [], declaredSlots: [], slotWrites: [], vocabVersions: { efx: '1.1.1', hooks: '1.0' } });
    const booklet = renderBooklet(renderRuleset(registry));
    expect(booklet).toContain('house-rule');
    expect(a11yAudit(booklet)).toBe(0);
    // K7-F6 D2: the floor MUST be able to fail — an unlabeled group counts (kills M8)
    expect(a11yAudit('<g><rect/></g>')).toBe(1);
    expect(a11yAudit('<g><title>ok</title></g><g><rect/></g><g><rect/></g>')).toBe(2);
  });

  it('the full table scene renders through the projection with a clean a11y floor', () => {
    const { state } = midGame();
    const svg = renderTable(project(state, 'B'), bindPlaceholder(KIND_CONTRACTS['Card']!));
    expect(a11yAudit(svg)).toBe(0);
    expect(svg).toContain('(awaiting decider)'); // B sees the window, not its options
    expect(svg).not.toContain('K1'); // redaction survives rendering
  });
});

describe('GBC-53 · the two clocks (GX-39; ODG-e1 stays open)', () => {
  it('displayClock derives from the view; advancing the timeline changes no state byte', () => {
    const { core, state } = midGame();
    const clock = displayClock(project(state, 'A'));
    expect(clock).toEqual({ round: 1, phase: 'start', status: 'playing', activeSeat: 'A' });
    const hash = core.getStateHash();
    const tl = new Timeline();
    tl.advance(5000);
    expect(tl.now()).toBe(5000);
    expect(core.getStateHash()).toBe(hash); // the game never noticed
    expect(() => tl.advance(-1)).toThrow(/finite and non-negative/);
    expect(() => displayClock(state as never)).toThrow(ProjectionBreach);
  });
});
