/**
 * PILE ACTIONS (the I-146 size-gate extraction — moved VERBATIM from table.ts onPick):
 * the four supply piles' click behavior. YOUR turn → the pile's verb through the doors
 * (hire · buy-equipment · pool-draw); off-turn → the deck's own tap-nudge (O-3 parity).
 */
import type { PlayAreaContext } from './component.js';
import { nudgeStack } from './stacks.js';

export function handlePileClick(ctx: PlayAreaContext, region: string): void {
  const v = ctx.projection();
  const myTurn = v.seats[v.turn.seatIdx]!.id === ctx.viewSeat;
  const isCardPool = region === 'bbb-pile' || region === 'networking-pile';
  if (myTurn) {
    // C-1c (I-156, the I-150 ruling): a plain CLICK no longer fires the verb — the
    // FLICK is the door (supply-draw claims the grab; a tap nudges via its weak path).
    // Reaching here on your turn is an edge case (e.g. read-mode entry) — hint, don't act.
    ctx.status(isCardPool
      ? `the ${region === 'bbb-pile' ? 'BBB' : 'NETWORKING'} deck — grab the top card and FLICK to draw it`
      : `${region === 'tradespeople-pile' ? 'the tradesperson pool' : 'the equipment pool'} — grab the top card and FLICK to ${region === 'tradespeople-pile' ? 'hire' : 'buy'}`);
  } else {
    nudgeStack(ctx.theater.focusObject(`table:${region}`)); // O-3: nudge parity on every pile
    ctx.status(isCardPool ? `the ${region === 'bbb-pile' ? 'BBB' : 'NETWORKING'} deck — draw on your turn` : `${region === 'tradespeople-pile' ? 'the tradesperson pool' : 'the equipment pool'} — hire on your turn`);
  }
}
