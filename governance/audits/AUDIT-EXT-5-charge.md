# EXTERNAL AUDIT 5 — VISUAL CONFORMANCE: the v1 extraction vs its source documents

Charge for an independent session with NO builder context. Scope: the `k7-pass-v1x`
increment (commits f94e51c..e7e3765) plus the archived sources (77a2b8a). You verify
that the coded layout children FAITHFULLY encode the BOTY v1 screens they claim to
measure — against the archived screenshots AND the live site. Refusal-not-repair: if
anything fails attestation or conformance, RETURN with the finding named; fix nothing.

## Step 0 — SYNC + ATTEST (mandatory first; a stale clone voids the audit)

In C:\Users\17783\CPA CMA Services\Projects\tabletop_platform:

    git fetch --tags && git pull
    git rev-parse HEAD
    git describe --tags
    git tag -l k7-pass-v1x

Report all four outputs in the report header. HEAD must be at or after `77a2b8a`
("Audit sources: archive the nine BOTY-v1 screens…") and `k7-pass-v1x` must exist.
Then attest the sources:

    sha256sum governance/audits/sources/v1-screens/*.jpg    (Windows: certutil -hashfile <file> SHA256)

Every hash must match `governance/audits/sources/v1-screens/SOURCES.md`. Any mismatch
or missing file → RETURN immediately.

## Step 1 — SOURCE FIDELITY (are the archived screens really v1?)

Open https://boty-web.vercel.app in your browser. Walk: landing → Enter → home menu →
Play Online → host a lobby → start a game with CPUs → play until the round-1 card and
a drawn card appear. Compare what you see against the nine archived screens (SOURCES.md
maps each). Verdict per screen: FAITHFUL / STALE (v1 has changed) / FABRICATED.
Cosmetic content differences (different card text, different cash values, different
lobby code) are FAITHFUL; structural differences (a column missing, a modal that is not
card-shaped, no deck count) are findings.

## Step 2 — MEASUREMENT CONFORMANCE (do the coded children encode the screens?)

Read `packs/boty/src/layouts.ts` (the four children + exported overlays). For each,
measure the corresponding structure in the archived screens (pixel-measure in any image
tool; tolerance ±8 percentage points of the relevant dimension — these are contracts,
not pixel art):

1. `boty:fortune-card` vs 09-card-drawn-character.jpg (and the Fortune column card in
   05): art region coded at y=4,h=52 (52% of card height, top). Measure v1's art
   fraction. Verify the coded order art → title → subtitle → text → payout matches the
   screen's top-to-bottom order, `modifiers` is genuinely absent in v1, and nothing
   MATERIAL in v1's card anatomy is missing from the child.
2. `boty:round-card` vs 07/08: art ~50% top, then "Round N · Season" title, italic
   lore, gold callout, single action button. Same checks. Confirm v1's modal is
   card-shaped (the modal-as-card claim, I-51a) — i.e. this is a card layout, not a
   generic dialog the builder forced into a card.
3. `boty:shop-board` vs 05/06: verify the coded vertical anatomy (art-banner →
   identity/counters → building-tier → crew/equipment/local-play → jobs-list/hand →
   ar/ap/actions) matches v1's shop column order; verify all six adds correspond to
   REAL v1 structures (building tier row, jobs list, AR panel, AP panel, action strip,
   art banner) and that no v1 shop structure of the same rank is silently missing
   (TRADESPEOPLE and EQUIPMENT must map to the overridden crew/equipment regions).
4. `boty:town-table` vs 05: standings (ranked rows: name, badge, gold cash, subline)
   and TABLE LOG both exist in v1's table panel; the child adds exactly these two and
   overrides nothing.

Also verify in `packs/boty/tests/boty-layouts.test.ts` that each child's declared
`shadowed` record asserted there matches what you measured as the v1-driven changes.

## Step 3 — TRACE CONFORMANCE (I-51 a–e vs the screens)

Read the I-51 row in `INSTRUMENTS/drift-ledger.md` and check each leg against the
screens: (a) both modals are cards; (b) art 55–70% claim (report your measured range);
(d) the header/banner/footer items listed exist in 05; (e) spot-check the grammar rows
in `packs/boty/skin-token-candidates.md` — money gold? exactly one red danger item per
screen? deck shows its count? active row gold-outlined? Name any claim the screens do
not support.

## Step 4 — LIVE RENDER (does the bench realize the anatomy?)

    npm install
    cd utilization\bench
    node build.mjs
    python -m http.server 4173

Open http://localhost:4173/game.html. Expect UNSKINNED FRAMES — dashed regions, no
art, no v1 colors. Absence of paint is CORRECT (D-1); structure is what you audit:
round card pops on load naming the ACTIVE seat as leader (end a turn, reload — the
name must change with the turn, never a constant); clicking the deck pops the drawn
card as the fortune child; deck shows its count; standings rows rank by cash with the
active row marked, clicking one focuses that shop; table log lists recent moves; each
shop board shows the boty:shop-board regions incl. visibly-bracketed placeholders
(`[trade]`, `[building · tier —…]` — placeholders must READ as placeholders, an
asserted fake fact is a finding); End turn sits on the active board only. Also run:

    node ..\..\utilization\bench\run-target-check.mjs   (from the repo root: node utilization/bench/run-target-check.mjs)

Expect BATTERY 21/21 · DRILLS 5/5.

## Report

`governance/audits/K7_AUDIT_REPORT-5.md`: attestation block (Step 0 outputs verbatim),
per-step verdicts with measurements (report your numbers, not just pass/fail), findings
numbered blocking/major/minor, and PASS / RETURN overall. Do not modify any repo file
other than adding your report. Deliver the report file back to the build session.
