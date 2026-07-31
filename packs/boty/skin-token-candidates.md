# BOTY skin-token candidates (RECORDED, NOT PAINTED — D-1 stands)

Source: the owner's nine BOTY-v1 screenshots (boty-web.vercel.app), measured 2026-07-31.
These are CANDIDATE token values for the future skin era. Nothing here binds today —
the template's frames stay unskinned until the owner opens skin work. Token names follow
the MP4 namespace.dotted contract; values are what v1 proved on real players.

## Ground & surfaces

| Token (candidate) | v1 value | Where v1 proved it |
|---|---|---|
| surface.ground | `#161a22` (near-black blue) | every in-game screen's page ground |
| surface.panel | slightly lifted dark (`~#1d222c`) with 1px muted border, radius ~10px | table/shop/fortune columns, AR/AP panels |
| surface.card | dark panel + heavier border; art gets its own inner frame | fortune card, round card, character card |

## The color grammar (the law-like part — v1's strongest lesson)

| Token (candidate) | v1 value | Grammar rule proved |
|---|---|---|
| accent.gold | `~#eab308` warm gold | MONEY is always gold; primary CTA is gold; the active entity's outline is gold |
| accent.confirm | green | advance/commit only (End turn) — one green thing per screen |
| accent.danger | red | the ONE danger item on screen (Leave · Equipment breakdown art tint) |
| accent.prompt | amber border glow | the thing awaiting the player (alert banner, popped card border) |
| text.primary / text.muted | white / gray | bold-line + muted-subline on EVERY entity row (players, crew, jobs) |
| text.flavor | italic serif-leaning gray | lore lines, quotes, org subtitles |

## Object treatments

| Token (candidate) | v1 treatment |
|---|---|
| deck.count | the deck ALWAYS shows its count ("59 left") beside a stacked-card glyph |
| row.active | gold outline + slight lift on the active player's standings row |
| presence.dot | small green dot per connected CPU/remote player, in the banner line |
| art.dominance | card art at 55–70% of card height (realized as layout overrides — I-51b) |

## Explicitly NOT tokens

Region geometry (that is layout law, packs/boty/src/layouts.ts) · chrome arrangement
(bench furniture, I-51d) · copy/wording (content).
