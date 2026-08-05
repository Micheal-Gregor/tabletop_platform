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
    if (isCardPool) {
      const pool = region === 'bbb-pile' ? 'bbb' : 'networking';
      if (ctx.submit('pool-draw', { pool })) {
        ctx.rebuild();
        ctx.status(`drawn from ${pool.toUpperCase()} — the card joins your local row`);
      }
    } else {
      const verb = region === 'tradespeople-pile' ? 'hire' : 'buy-equipment';
      if (ctx.submit(verb, {})) {
        ctx.rebuild();
        ctx.status(verb === 'hire' ? 'hired — a new tradesperson joins your crew' : 'bought — the equipment joins your rack');
      }
    }
  } else {
    nudgeStack(ctx.theater.focusObject(`table:${region}`)); // O-3: nudge parity on every pile
    ctx.status(isCardPool ? `the ${region === 'bbb-pile' ? 'BBB' : 'NETWORKING'} deck — draw on your turn` : `${region === 'tradespeople-pile' ? 'the tradesperson pool' : 'the equipment pool'} — hire on your turn`);
  }
}
