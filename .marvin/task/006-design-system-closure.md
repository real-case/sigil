---
slug: design-system-closure
type: feature
status: shipped
created: 2026-08-04
tracker: none
supersedes: none
stack: markdown
risk: low
breaking: false
spike_required: false
test_command: npm test
contract_sha: d3fed5c32af3940e
---

# Design-System Followups: Close Item 5 and the Program

## Goal
Record that followup item 5 (shared `Legend.tsx` primitive) is satisfied by the v0.3.0 redesign's richer `ValueLegend`, and close the followups program on the repo side: flip item 5's "⏳ Open — needs revision" banner to shipped-with-deltas (including the honest residual — the legend interaction state machine stays duplicated per consumer), reframe the doc's still-open preamble, collect all six superseded token values into one section routed to the DesignSync reconciliation, update the stale "Suggested order" line and footer, and reconcile the two stale item-5 references in `SPEC.md` (the `Legend` *(deferred)* primitives-table row that still claims Recharts `<Legend>` usage, and the "doesn't enforce yet" followups pointer). Two documentation files; no widget code.

## Context
- Related patterns: `specs/design-system-followups.md` (item 5 banner written by spec 005; preamble lines 3–5 and 17 still present the program as open — flagged by 005's diff critic "for author decision"; "Suggested order" body says "only item 5 remains, pending its revision" (line 147) and the footer says "item 5 open, pending revision" (line 161) — both stale after this task). `SPEC.md` is described by CLAUDE.md as the original build plan kept as a design record, but two of its lines are live claims, not history: `SPEC.md:284` lists `` `Legend` *(deferred)* `` in the shared-primitives inventory and states "Widgets currently use Recharts `<Legend>` with `wrapperStyle`" — false (zero Recharts `Legend` usages repo-wide; `ValueLegend` exists and is absent from the table); `SPEC.md:242` calls the followups "deferred feature work … doesn't enforce yet".
- Callers / reverse-deps: `SPEC.md:242,284` — the two semantic references above (this correction is F2). Inbound path links from specs 002–005 are unaffected (the file does not move). `specs/design-system-brief.md:39,147` mentions a Legend primitive but carries no status claim (an ingestion brief; its stated behavior is what shipped) — correctly outside the allowlist. No code consumers.
- Constraints and verified facts (all verified in code this session; line refs exact): `ValueLegend` (`src/widgets/shared/ValueLegend.tsx`) ships in **four** widgets — pie, bar, line, scatter — and **zero** raw Recharts `Legend` usages remain (heatmap/map use `ColorScaleLegend`; map adds a local `BubbleSizeLegend` — neither is Recharts). Interaction, precisely: the legend row restyles on `:hover` (sunken background + border, swatch `scale(1.08)` — `styles.css:247-250,275-280`) rather than dimming legend siblings at the token's 0.4; hover *focus* dims the non-focused series **in the plot** via each consumer's `opacityFor` with `UNFOCUSED_OPACITY = 0.2` (line, scatter) / `0.32` (bar, pie); click-mute keeps series at 18% (`MUTED_OPACITY = 0.18` ×4). `ValueLegend` owns chrome only — `ValueLegend.tsx:57` is `void focused` — and the `focused`/`muted` state, `toggleMute`, and `opacityFor` bodies are duplicated near-verbatim in all four consumers (line:77-78, bar:98-99, pie:64-65, scatter:45-46): the sketch's "most coordination across widgets" tradeoff was *not* eliminated, and the closure must record that residual. Architecture: renders outside the Recharts tree (after `</ResponsiveContainer>`), no `<Legend content>` adapter. Token compliance of `components.legend.*` (six keys total): `muted-opacity` 0.4 **matches** (`styles.css:258`), `transition` background/fast/standard **matches** (`:241-242`); **superseded** — `legend.gap` 12px → 4px column / 10px row (`:206,214`), `legend.item-padding` 3px 4px → 11px 13px (`:232`), `legend.item-radius` 4px → `radius-lg` (`:234`), `legend.swatch-size` 10px → 14px (`:263-264`). Prior supersessions per spec 005: `chart.line.area-fill` dark split and `chart.line.end-cap-radius` per-series split — six values total. Redesign commit `b11de90` is `ValueLegend.tsx`'s only commit. In `SPEC.md`, `wrapperStyle` and `(deferred)` each occur exactly once (line 284) and `ValueLegend` zero times — clean oracle strings; a repo-wide sweep found no third file with a live item-5 status claim. CLAUDE.md — English-only Markdown; PRs target `dev`.
- Sibling specs: 001–005 all `shipped`. Spec 005 wrote the current item-5 banner and queued the DesignSync token reconciliation with two values; this task extends that hand-off to six and closes the program 005 left one item short. No spec 001–005 ever touched or fenced `SPEC.md` (verified) — its staleness was never triaged until now.

## Spec Contract
The authoritative, machine-validated contract. The implementer may touch **only** the files listed in `files`.

```yaml spec-contract
files:
  - id: F1
    path: specs/design-system-followups.md
    action: edit
    intent: four edits, sketches and items 1–4 banners verbatim throughout — (1) item 5's "⏳ Open — needs revision" banner becomes a "✅ Shipped" banner citing commit b11de90, recording deltas precisely — ships in four widgets including bar; value-bearing rows with meter and min/avg/max range variants; the legend row restyles on hover while focus dims the non-focused series in the plot (0.2 line/scatter, 0.32 bar/pie) instead of the sketch's dim-legend-siblings-at-0.4; click-mute keeps series at 18% in the plot; renders outside the Recharts tree so the content-adapter idea was dropped; muted-opacity 0.4 and the fast background transition match the tokens while legend.gap, legend.item-padding, legend.item-radius, legend.swatch-size are superseded by the richer July chrome; and the honest residual — the focused/muted interaction state machine remains duplicated per consumer widget, so the sketch's single-point-of-coordination goal is only half met (chrome shared, state not; a future consolidation is noted). (2) The preamble blockquote gains a closing paragraph — repo-side program closed, all five items resolved, six superseded token values await the DesignSync reconciliation (plain prose, no pending-marker glyph) — and the "Each item below should ship as its own PR." line moves to past tense. (3) A new "## Superseded token values" section placed before "## Out of scope" lists all six values with fully qualified names — chart.line.area-fill (dark split), chart.line.end-cap-radius (per-series split), legend.gap, legend.item-padding, legend.item-radius, legend.swatch-size — each as token value vs shipped value, closing by naming the DesignSync/design-project flow as owner of the token-record update. (4) The "Suggested order" body's "only item 5 remains, pending its revision" becomes "all five items are resolved (see the status banners above)", and the footer becomes a 2026-08-04 line stating the repo-side program is closed and token supersessions await DesignSync reconciliation. The ✅ marker appears exactly five times in the file, only in item banners — preamble, Superseded section, and footer use none
    satisfies: [AC1, AC2, AC3]
    anchor: specs/design-system-followups.md:123
  - id: F2
    path: SPEC.md
    action: edit
    intent: two surgical corrections, nothing else — (1) the shared-primitives table row (line 284) is replaced (not left as a residual row alongside a new one) — the stale "Legend (deferred) … Widgets currently use Recharts Legend with wrapperStyle" becomes a ValueLegend row linking src/widgets/shared/ValueLegend.tsx, describing it as the value-bearing interactive legend (hover-focus, click-mute, meter/range variants) shipped by the v0.3.0 redesign, closing followups §5; (2) the canonical-sources bullet (line 242) drops "doesn't enforce yet" phrasing in favor of naming the followups doc a closed program ledger with per-item status banners
    satisfies: [AC4]
    anchor: SPEC.md:284
build_order: [F1, F2]
depends_on: []
contract:
  kind: none
  signature: |
    none — two documentation files change; no callable surface
criteria:
  - id: AC1
    statement: Item 5 is recorded as shipped — its section carries a "✅ Shipped" banner naming ValueLegend and commit b11de90, the file-wide "✅ Shipped" count is exactly 5, and no "⏳" marker or "needs revision" text remains anywhere in the file
    implemented_by: [F1]
    oracle:
      kind: command
      ref: >-
        sed -n '/^## 5\./,/^## Suggested/p' specs/design-system-followups.md | grep -q '✅ Shipped' &&
        sed -n '/^## 5\./,/^## Suggested/p' specs/design-system-followups.md | grep -q 'ValueLegend' &&
        sed -n '/^## 5\./,/^## Suggested/p' specs/design-system-followups.md | grep -q 'b11de90' &&
        test "$(grep -c '✅ Shipped' specs/design-system-followups.md)" = 5 &&
        ! grep -q '⏳' specs/design-system-followups.md &&
        ! grep -qi 'needs revision' specs/design-system-followups.md
    failure: the last item keeps reading as open, the banner lands outside item 5's section, or a stray open-marker survives elsewhere in the file
  - id: AC2
    statement: The program closure is recorded and self-consistent — the preamble states the program is closed, the Superseded-token-values section sits before Out of scope and lists all six fully qualified values naming DesignSync as owner, no "pending revision" phrasing survives anywhere (Suggested-order line 147 and footer line 161 both die), and the footer's last lines carry the 2026-08-04 closure claim
    implemented_by: [F1]
    oracle:
      kind: command
      ref: >-
        sed -n '1,/^## Why/p' specs/design-system-followups.md | grep -qi 'closed' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q '^## Out of scope' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q 'chart.line.area-fill' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q 'chart.line.end-cap-radius' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q 'legend.gap' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q 'legend.item-padding' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q 'legend.item-radius' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -q 'legend.swatch-size' &&
        sed -n '/^## Superseded token values/,/^## Out of scope/p' specs/design-system-followups.md | grep -qi 'DesignSync' &&
        ! grep -qiE 'pending( its)? revision' specs/design-system-followups.md &&
        tail -3 specs/design-system-followups.md | grep -qi 'closed' &&
        grep -q '2026-08-04' specs/design-system-followups.md
    failure: the preamble keeps presenting the program as open, the token section lands after Out of scope or misses a value, the 005-era pending-revision lines survive in the order section or the footer, or the footer's closure claim is absent
  - id: AC3
    statement: The closure is a record, not a rewrite — all five item sketches and the items 1–4 banners are byte-identical in the followups doc, SPEC.md changes only at its two named spots with the old Legend row replaced rather than left as a residual alongside the new one, the diff touches exactly these two files, all edits are in English, and specs/design-system-tokens.json stays untouched
    implemented_by: [F1, F2]
    oracle:
      kind: prose-review
    failure: historical rationale or the 005-authored banners get rewritten, SPEC.md edits sprawl beyond the two stale claims or a stripped Legend row survives beside the ValueLegend entry, a third file sneaks into the diff, or the token record is edited instead of routed
  - id: AC4
    statement: SPEC.md stops contradicting the shipped state — it names ValueLegend in the shared-primitives inventory, and its stale claims (the "(deferred)" Legend row and the Recharts wrapperStyle-legend assertion) are gone
    implemented_by: [F2]
    oracle:
      kind: command
      ref: >-
        grep -q 'ValueLegend' SPEC.md &&
        ! grep -q 'wrapperStyle' SPEC.md &&
        ! grep -qF '(deferred)' SPEC.md
    failure: the build-plan record keeps listing a shipped primitive as deferred and asserting legend code that no longer exists — the exact staleness class this program's closure exists to end
```

## Host Bindings
Discovered from this repo.

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: none
  path: none
merge_obligations:
  - all Markdown in this repository is written in English (CLAUDE.md documentation-language rule)
  - typecheck + tests + build green (npm run typecheck / npm test / npm run build)
  - PRs target dev; main is release-only (CLAUDE.md branch & release workflow)
gates:
  test: npm test
  typecheck: npm run typecheck
  build: npm run build
```

## Data & Config
N/A — two Markdown files; no migrations, env vars, flags, or config.

## Chosen Approach
Docs closure, variant 2 from dialogue (banner + program closure), extended per critic round 1 with the SPEC.md reconciliation:

1. Item 5 banner per the F1 intent — shipped-with-deltas, interaction described precisely (row `:hover` restyle + plot-side focus dimming at 0.2/0.32 + 18% mute), the matched/superseded token split, and the honest residual (state machine duplicated per consumer; consolidation seeded as future work).
2. Preamble closure paragraph (repo-side closed; six token values await DesignSync — plain prose, no marker glyph) and the per-PR line in past tense; history sections stay untouched.
3. `## Superseded token values` before `## Out of scope`: six rows with fully qualified token names, token value vs shipped value, DesignSync named as owner. The single hand-off artifact for that follow-up.
4. "Suggested order" body and footer per the F1 intent; the ✅ marker stays exclusive to the five item banners.
5. SPEC.md per the F2 intent — the primitives-table row becomes a real `ValueLegend` entry (replacing the stale row); the canonical-sources bullet stops saying "doesn't enforce yet".

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:** none.

## Why this over alternatives
- V1 — banner flip only (rejected): leaves the preamble and SPEC.md presenting a closed program as open — the exact residual-staleness class 005's diff critic flagged and this closure exists to end.
- Fencing SPEC.md as an untouchable design record (rejected, critic round 1): unlike the tokens JSON (owned by the design project), SPEC.md's line 284 is a present-tense inventory claim ("Widgets currently use Recharts `<Legend>`") that is false; a record may keep history, not live falsehoods. The edit is two surgical lines.
- V3 — banner + archive/move (rejected): a path move breaks inbound links from specs 002–005 and git-history continuity for no reader benefit.
- Align ValueLegend's chrome to the May token values (rejected in dialogue): the July redesign is the newer design intent and the claude.ai/design project is the source of truth; regressing shipped chrome to stale tokens is backwards.
- Adopt the sketch's dim-legend-siblings hover (rejected in dialogue): a real UX change to four widgets against the deliberately designed plot-side focus emphasis; nothing indicates the shipped interaction is wrong.

## Test Plan
- No code changes and no new tests — the existing suite (282 tests incl. the 005 drift pin) plus typecheck and build run as regression gates and must stay green.
- AC1/AC2/AC4 are command oracles; every clause verified to fail against the current files (critic-confirmed empirically): item 5's section carries ⏳/needs-revision and no ✅ Shipped; the count is 4; no Superseded-token-values heading exists (so its scoped greps and the placement clause fail); "pending its revision" (line 147) and "pending revision" (line 161) are present; the footer says 2026-08-03; SPEC.md lacks ValueLegend and carries wrapperStyle/(deferred) exactly once each.
- The AC2 placement clause (`… | grep -q '^## Out of scope'`) proves the section sits *before* Out of scope — a section appended at EOF makes the sed range run to EOF without the terminator line and the clause fails (critic-verified against the wrong edit).
- AC3 is prose-review at PR time (two-file diff, banners 1–4 and sketches byte-identical, SPEC.md minimal with the old row replaced, tokens JSON untouched).

## Definition of Done
- [ ] `npm run typecheck`, `npm test`, `npm run build` green (regression only)
- [ ] AC1/AC2/AC4 command oracles pass; AC3 walked at review
- [ ] The diff touches exactly two files plus the `.marvin/task/` lifecycle artifacts; all edits in English
- [ ] Delivery PR targets `dev` per the branch workflow

## Non-goals
- Editing `specs/design-system-tokens.json` — the six superseded values are routed to the DesignSync/design-project reconciliation, which owns the token record
- Consolidating the duplicated legend interaction state (focused/muted/toggleMute/opacityFor ×4 consumers) — recorded in the banner as the honest residual and seeded under Future Considerations, not done here
- Any change to `ValueLegend`, its consumers, or any widget code or styles
- Editing `TESTING.md` — its pie/line/table rows were corrected by spec 005; the scatter row's stale "Legend dots are circles" (`TESTING.md:134` — the shipped swatch is a 14px rounded square, `styles.css:261-265`) is the second named finding for the queued §A5 re-audit, treated uniformly with the bar row's "tick font" conflation rather than fixed as a ride-along here
- SPEC.md changes beyond the two named spots (it remains the historical build plan otherwise)
- Archiving, renaming, or moving the followups doc (V3 rejected)
- The seven-row §A5 re-audit follow-up itself (queued, now with two named findings)

## Assumptions
- Closing the program inside the followups doc (plus the two-line SPEC.md reconciliation) is the authoritative repo-side record; the DesignSync reconciliation remains a queued follow-up and now carries six values instead of two.
- The "✅ Shipped" count moving from 4 to 5 breaks nothing — verified: no test or workflow greps that count (the 005 oracle was point-in-time; the drift-pin test reads only `.design-sync/config.json`).
- Item 5 is recorded as shipped **by** the redesign (commit b11de90) rather than by any followup PR — matching how item 2 is already recorded.
- `.marvin/task/verification.md` (untracked 005 artifact) stays untracked per the sibling convention — delivery stages files explicitly, never `git add -A`.

## Open Questions
none

## Security / NFR
N/A — two Markdown files; no code, auth, input, network, or PII surface.

## Critic Verdict & Overrides
Round 1: BLOCK — two blockers (the Context's "no reverse-deps" claim missed SPEC.md's two semantic item-5 references, one factually false today; the footer deliverable had no oracle — the critic built the lazy edit and passed every clause with a self-contradicting footer) and six warnings (Superseded-section placement unpinned; the hover delta wording hid the plot-side dimming values; "superset" over-claimed past the duplicated state machine; only four of six token values grepped; two item-5 clauses non-discriminating alone; "closed" in tension with the pending DesignSync hand-off). All addressed: F2/AC4 added for SPEC.md; footer pinned; placement clause added; six values grepped fully qualified; interaction facts stated with UNFOCUSED_OPACITY values; the residual duplication recorded in banner, Non-goals, and Future Considerations; closure phrased repo-side with the hand-off in plain prose.

Round 2: PASS WITH WARNINGS — both blockers re-verified closed with the fixes empirically exercised against correct and wrong edits (the round-1 lazy edit now fails two independent clauses; the EOF-placement edit fails the terminator clause; every new clause green on a correct edit, so no false failures). Allowlist completeness re-swept repo-wide: every wrapperStyle/(deferred)/§5 hit is inside the two allowlisted files; the design brief's Legend mention is an ingestion input with no status claim, correctly excluded. Round-2 warning folded: `TESTING.md:134` ("Legend dots are circles" vs the shipped rounded-square swatch) is named in Non-goals and routed to the §A5 re-audit rather than fixed as a ride-along. Critic Q1 folded: AC3 now explicitly bans a residual stripped Legend row beside the new ValueLegend entry. Critic Q2: AC3's statement covers F2's two-spot minimality directly. No overrides.

## Design Notes
- The ✅ marker appears exactly five times, only in item banners — preamble, Superseded section, and footer use plain prose (AC1 pins the count). The pending DesignSync work is marked by prose in the Superseded section and footer, deliberately without a glyph.
- AC1's `ValueLegend`/`b11de90` clauses are individually non-discriminating today (both already appear in the ⏳ banner at line 123); the conjunction discriminates through the `✅ Shipped` clause — acknowledged per critic round 1 rather than implied otherwise.
- The Superseded-token rows use fully qualified names (`legend.item-radius`, not `item-radius`) so the AC2 greps cannot be satisfied by the item-5 sketch's own token mentions outside the section — and the two chart.line names, though present at lines 51/75, sit above the section range and cannot leak in (critic-verified).
- The banner's residual-duplication note is one sentence; the consolidation idea lives in Future Considerations, keeping the banner a record rather than a plan.
- The item-5 sketch's own `wrapperStyle` mentions (lines 127/137) are inside the byte-identical sketch body — AC4's `wrapperStyle` ban is SPEC.md-scoped, so AC3 and AC4 cannot conflict.

## Future Considerations
- Legend interaction-state consolidation — a shared hook (e.g. `useLegendState`: focused/muted/toggleMute/opacityFor) across the four ValueLegend consumers; seeded by the banner's residual note, parked alongside the stat-panel/table shared-sparkline consolidation.
- DesignSync token-record reconciliation — now six values, listed in the new section; supersedes the two-value listing in spec 005's Future Considerations.
- The §A5 seven-row re-audit follow-up — now with two named findings: the bar-chart row's "tick font" conflation and the scatter row's "Legend dots are circles" (`TESTING.md:134`).
- With the design-system followups closed, the roadmap's polish phase is complete — dashboards/maps are next per the project roadmap.

## Delivery
- **PR:** https://github.com/real-case/sigil/pull/47 (2026-08-04, target `dev`)
- **Gates:** test 282/282 (regression only), typecheck, build — PASS (explicit spec gates; lint N/A, no ESLint config). AC1/AC2/AC4 command oracles PASS on the final tree, independently re-run by the diff critic; AC3 walked via hunk analysis — F1 exactly five sanctioned regions, sketches and items 1–4 banners byte-identical, SPEC.md exactly two single-line hunks with the old Legend row replaced (single `Legend` hit remaining: the new ValueLegend row), tokens JSON untouched, all edits English.
- **Diff critic:** PASS WITH WARNINGS, no blockers — every banner/table number spot-checked against code. Three record-precision one-liners applied pre-commit (full `components.legend.*` paths in the hand-off table, layout-mode disambiguation in the gap cell, the muted-row clarifier on the 0.4 match), oracles and fast gates re-run green after.
- Contract seal verified at implement start; scope gate 2/2. The followups program is closed repo-side; the six-value DesignSync hand-off and the §A5 re-audit (two named findings) remain the queued follow-ups.
