---
slug: design-system-docs-refresh
type: feature
status: in-progress
created: 2026-08-03
tracker: none
supersedes: none
stack: typescript
risk: low
breaking: false
spike_required: false
test_command: npm test
contract_sha: aba7efed48441ae3
---

# Docs Refresh: Reconcile Design-System Records with Shipped Followups 1–4

## Goal
Reconcile three documentation artifacts with the shipped state of design-system followup items 1–4 — `specs/design-system-followups.md` (still written as open work, plus a stale fonts footnote queued by spec 002), `TESTING.md` (§A3 smoke prompt, §A3 pass criteria, and §A5 QA rows predate the redesign and the four features; the pie/line rows carry actively false values), and `.design-sync/config.json` (TableView and PieChartView `dtsPropsFor` payload types missing `kind`/`number[]` and `maxSegments`) — and add a vitest drift pin that derives its expectations from the live tool schemas, so a payload change that forgets the config fails the suite. This closes the repo-side docs-refresh debt queued across specs 002–004, explicitly re-routing the token-JSON half of that queue to the DesignSync flow (see Non-goals and Future Considerations).

## Context
- Related patterns: `specs/design-system-followups.md` items 1–5 (sketches written 2026-05-14, pre-implementation) and its Out-of-scope fonts footnote (line 152, claims Google Fonts CDN; shipped is self-hosted `@fontsource`, inlined — `src/widgets/shared/styles.css:1-9`); `TESTING.md:66-99` (§A3 prompts + pass criteria), `TESTING.md:125-156` (§A5 per-widget QA table); `.design-sync/config.json` `dtsPropsFor` (hand-maintained payload-type strings consumed by DesignSync); `src/__tests__/e2e.test.ts:52-61` in-memory client pattern (createServer + InMemoryTransport) and `:19-20` REPO_ROOT resolution for the new test.
- Callers / reverse-deps: `.design-sync/config.json` is consumed by the DesignSync tooling only (no runtime import); the two Markdown files have no code consumers. The new test joins the existing vitest suite (`npm test`) and imports `createServer`/`WIDGETS` read-only.
- Constraints and verified facts (all re-verified in code this session): item 1 `maxSegments?: number` at `src/shared/payloads.ts:51` (spec 002, PR #42). Item 2 area fill shipped with the v0.3.0 redesign (commit b11de90, no spec) — gradient fill under **every** series while `series.length <= 3` (`LineChartView.tsx:33,303`), top stop `AREA_TOP_OPACITY = 0.18` in **both** themes (`:30,215`) — the token's "18% (light) / 22% (dark)" dark split did not ship. Item 3 split across two deliveries — end dots shipped with b11de90 (r 4, ring 2 — `LineChartView.tsx:343,346`), start caps via spec 003 / PR #43 (r 3, ring 1.5); radii are per **position**, not per series — the token's primary/secondary split was explicitly rejected (003 Non-goals) and 003:169 records the token values as **superseded**, deferring the token JSON to a docs task. Item 4 sparkline columns (spec 004, PR #44). Line strokes are 2.4 px uniform (`:29`); donut inner radius is 54% (`PieChartView.tsx:28`); legend behavior is hover-focus / click-mute (`ValueLegend.tsx:77-81`). `specs/design-system-tokens.json` is a versioned design record whose two `chart.line` entries are known-superseded — reconciling it belongs to the DesignSync/design-project flow, not this repo-side refresh (Non-goals). CLAUDE.md — all Markdown in English; PRs target `dev`.
- Sibling specs: 001-dev-main-branch-workflow, 002-pie-max-segments-other, 003-line-end-caps, 004-table-sparkline-columns — all `shipped`. Specs 002 (fonts footnote, followups staleness), 003 (token supersession, TESTING refresh), and 004 (this task by name) queued the debt this spec closes.

## Spec Contract
The authoritative, machine-validated contract. The implementer may touch **only** the files listed in `files`.

```yaml spec-contract
files:
  - id: F1
    path: specs/design-system-followups.md
    action: edit
    intent: per user decision, status banners — blockquote directly under each item heading, historical sketches verbatim below. Item 1 "✅ Shipped — spec 002, PR #42" + deltas (maxSegments payload knob integer ≥ 2 default 5, click-to-expand Other with Show-top-N collapse, CSV exports all original rows). Item 2 "✅ Shipped — v0.3.0 redesign, commit b11de90" + deltas (gradient fill under every series while ≤ 3 series, uniform 18% top stop in both themes — the token's dark-split opacity did not ship and is superseded). Item 3 "✅ Shipped — end dots with commit b11de90; start caps spec 003, PR #43" + deltas (radii per position — end r 4 / ring 2, start r 3 / ring 1.5, identical across series; the token's per-series 3 / 2.5 split rejected per 003 Non-goals, token values superseded). Item 4 "✅ Shipped — spec 004, PR #44" + deltas (mono last-value readout beside the spark, scalar cells legal as plain text, missing/empty/non-finite cells as em dash narrowing the sketch's with-null-gaps idea, CSV one joined quoted cell, sort by last value, filter excludes spark digits). Item 5 "⏳ Open — needs revision" banner (the redesign shipped a value-bearing legend the sketch predates). Out-of-scope fonts footnote rewritten to shipped reality (IBM Plex self-hosted via @fontsource, inlined into each single-file bundle — replacing the Google-Fonts-CDN claim). "Suggested order" body replaced by a one-line retirement note. Footer updated to 2026-08-03 with a plain-text status summary that avoids the ✅ marker so the banner count stays exactly 4
    satisfies: [AC1, AC4]
    anchor: specs/design-system-followups.md:21
  - id: F2
    path: TESTING.md
    action: edit
    intent: per user decision — §A3 smoke prompt 4 becomes a three-column table prompt (region, revenue, trend) where trend is a sparkline column holding a few weekly values per row; §A3 pass-criteria legend clause corrected to shipped ValueLegend behavior (hover focuses a series in the plot, click mutes it). §A5 rows updated to shipped reality while being touched — the pie row gains the collapse of over-cap slices into a muted "Other" (quoted, capitalised) with click-to-expand and Show-top-N plus CSV-still-full, and its donut inner radius corrected from 60% to 54% — the line row rewritten to 2.4 px uniform strokes, gradient area fill under every series while ≤ 3 series fading to the baseline (18% top stop, both themes), and start/end cap dots (end r 4 ring 2, start r 3 ring 1.5, surface-colored rings, same for all series) — the table row gains the sparkline checks (56×16 series-0 spark + mono last-value readout, centered by default, sort by last value, filter never matches spark digits, row hover must not re-emphasize the spark, CSV one joined quoted cell per series) and corrects its "mono uppercase tick font" header wording to the shipped axis-cap font naming. The remaining seven §A5 rows are untouched (full re-audit is a named non-goal)
    satisfies: [AC2, AC4]
    anchor: TESTING.md:77
  - id: F3
    path: .design-sync/config.json
    action: edit
    intent: dtsPropsFor.TableView — columns gain kind and rows widen to include number arrays, with the JSDoc line extended to state sparkline cells are number arrays oldest to newest; dtsPropsFor.PieChartView — payload gains optional maxSegments with the JSDoc mentioning the expandable Other collapse. No other keys change
    satisfies: [AC3]
  - id: F4
    path: src/__tests__/design-sync-config.test.ts
    action: new
    intent: node-only vitest drift pin deriving expectations from the live protocol, not from the config itself — describe "design-sync config payload types" spins the in-memory client (createServer + InMemoryTransport, e2e pattern), lists tools, and for every widget asserts that the dts string for its View key (pascal-cased widget name + "View") names every top-level input-schema property and every property of direct array-item object schemas, matching each name with a word-boundary regex (the name followed by an optional question mark and a colon) rather than a bare substring so one-letter properties cannot false-pass; plus targeted asserts that TableView's dts carries the sparkline kind union and a number[] rows member and PieChartView's carries maxSegments. This test fails against the pre-F3 config (maxSegments and kind missing), proving it catches exactly the payload-change-forgets-config drift that occurred at specs 002 and 004
    satisfies: [AC3]
build_order: [F1, F2, F3, F4]
depends_on: []
contract:
  kind: none
  signature: |
    none — documentation edits plus a read-only test; no callable surface changes
criteria:
  - id: AC1
    statement: The followups doc records shipped reality with each citation under its own item — exactly four "✅ Shipped" banners, PR 42 inside item 1's section, commit b11de90 inside item 2's, PR 43 inside item 3's, PR 44 inside item 4's, a needs-revision note inside item 5's, and the Out-of-scope fonts footnote naming the shipped @fontsource self-hosting
    implemented_by: [F1]
    oracle:
      kind: command
      ref: >-
        test "$(grep -c '✅ Shipped' specs/design-system-followups.md)" = 4 &&
        sed -n '/^## 1\./,/^## 2\./p' specs/design-system-followups.md | grep -q 'pull/42' &&
        sed -n '/^## 2\./,/^## 3\./p' specs/design-system-followups.md | grep -q 'b11de90' &&
        sed -n '/^## 3\./,/^## 4\./p' specs/design-system-followups.md | grep -q 'pull/43' &&
        sed -n '/^## 4\./,/^## 5\./p' specs/design-system-followups.md | grep -q 'pull/44' &&
        sed -n '/^## 5\./,/^## Suggested/p' specs/design-system-followups.md | grep -qi 'needs revision' &&
        sed -n '/^## Out of scope/,$p' specs/design-system-followups.md | grep -q '@fontsource'
    failure: the doc keeps presenting shipped work as open, a citation lands under the wrong item, the footer summary inflates the banner count, or the CDN fonts claim survives outside the corrected footnote
  - id: AC2
    statement: TESTING.md exercises the shipped features in the right rows — the §A3 table smoke prompt includes a trend sparkline column, the §A5 pie row names the quoted "Other" collapse, the §A5 line row names the area fill and cap dots, and the §A5 table row names the sparkline checks
    implemented_by: [F2]
    oracle:
      kind: command
      ref: >-
        grep -q 'region, revenue, trend' TESTING.md &&
        grep -qE '^\|[^|]*pie-chart[^|]*\|.*"Other"' TESTING.md &&
        grep -qiE '^\|[^|]*line-chart[^|]*\|.*area fill' TESTING.md &&
        grep -qiE '^\|[^|]*line-chart[^|]*\|.*cap dot' TESTING.md &&
        grep -qE '^\|[^|]*table[^|]*\|.*[Ss]parkline' TESTING.md
    failure: manual live-host QA keeps testing the pre-redesign surface — or an implementer satisfies file-wide greps by editing only one row, which these row-scoped patterns forbid (each clause fails against the current file)
  - id: AC3
    statement: The two stale design-sync dts strings gain their missing members (TableView kind union plus number-array rows, PieChartView maxSegments), and the new schema-derived test pins every View's dts string to the live tool schemas so a payload property added without the config learning its name fails the suite
    implemented_by: [F3, F4]
    oracle:
      kind: test
      ref: src/__tests__/design-sync-config.test.ts::design-sync config
    failure: DesignSync keeps generating stale payload prop types, or the pin only asserts the config against itself and the next payload-side change drifts silently exactly as specs 002 and 004 did
  - id: AC4
    statement: The refresh is a record, not a rewrite — sketches under items 1–5 remain verbatim beneath their banners, all edits are in English per the CLAUDE.md documentation-language rule, and specs/design-system-tokens.json is untouched (its two superseded chart.line entries are recorded in the item 2/3 banners instead)
    implemented_by: [F1, F2]
    oracle:
      kind: prose-review
    failure: historical rationale is destroyed, non-English text lands in repository Markdown, or the versioned token record is edited out from under the DesignSync flow
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
N/A — no migrations, env vars, or flags. `.design-sync/config.json` changes are two string values inside `dtsPropsFor`; no key added or removed.

## Chosen Approach
Variant 3 from dialogue (prose refresh + drift pin), with the pin strengthened per critic round 1 to derive from the live schemas:

1. **F1 followups doc**: banners exactly per the F1 intent — including the item 2/3 token-supersession notes (the honest place to record that the token JSON's `area-fill` dark split and `end-cap-radius` per-series split were superseded by the shipped design, per spec 003), the fonts-footnote correction queued by spec 002, the item 5 revision pointer, the Suggested-order retirement, and a footer that avoids the ✅ marker.
2. **F2 TESTING.md**: §A3 prompt 4 → `Use render_table to show columns [region, revenue, trend] with rows US/1200, EU/950, APAC/670, where trend is a sparkline column holding ~6 weekly values per row.` §A3 pass criteria → legend clause becomes "legend hover focuses a series; legend click mutes it". §A5 pie/line/table rows per the F2 intent, in the table's terse "Look for" voice, correcting the false 60% and 1.75/1.5 px values and the "tick font" naming in place.
3. **F3 config.json**: TableView columns type gains the kind union, rows widen to include number arrays, JSDoc extended (sparkline cells are number arrays, oldest → newest). PieChartView gains optional maxSegments, JSDoc mentions the expandable "Other".
4. **F4 drift pin**: in-memory client per the e2e pattern; listTools; for each WIDGETS entry derive the View key (pascal-case + "View"), pull its dtsPropsFor string, and assert every top-level inputSchema property name and every property name of direct array-item object schemas appears in the string via the word-boundary matcher; then the two targeted asserts (TableView contains the kind union with sparkline and a number-array member; PieChartView contains maxSegments). Block name pinned — describe "design-sync config payload types".

**Stack compliance:** NATIVE
**Future alignment:** N/A (no VISION.md)

**Stack extensions required:** none.

## Why this over alternatives
- V1 — pure prose refresh (rejected): `.design-sync/config.json` went stale silently twice (payload-side changes at specs 002 and 004 with the config untouched); without a pin the drift recurs.
- V1.5 — config self-assertion pin (the round-1 draft, superseded): asserting the config contains its own literals only catches config edits; both historical drifts were payload edits with the config untouched, which a self-assert would have passed silently. Replaced by schema-derived assertions (critic round 1, blocker 5; verified by execution in round 2 — the walk reproduces exactly the two historical drifts against the pre-F3 config, with zero false failures across all ten Views).
- V2 — tsc-compiled dts verification (rejected): compiling every `dtsPropsFor` snippet against the real payload types is codegen + compiler machinery guarding a design-tooling config; the schema-derived name check catches the observed failure mode (a forgotten property) through the protocol surface every payload change must touch, at a fraction of the cost. Revisit only if drift recurs despite the pin.
- Restructuring the followups doc into shipped/open sections (rejected by user): dropping the historical sketches loses the recorded rationale the banners sit on top of.
- Editing `specs/design-system-tokens.json` to match shipped values (rejected): it is a versioned design record whose source of truth is the claude.ai/design project; repo-side edits would desync the DesignSync flow. The supersession is recorded in the banners; reconciliation is a named follow-up through that flow.

## Test Plan
- Harness: vitest, node-only (`npm test`); F4 follows `e2e.test.ts` conventions (in-memory client in beforeAll, REPO_ROOT via `fileURLToPath`, plain describe/it, no fixtures) and reads the config with `node:fs` + `JSON.parse`.
- Sequencing note: F4 fails while F3 is unapplied (that failing state is the proof the pin works — observed once during implementation, then green after F3 per build_order F3 → F4).
- AC1/AC2 are command oracles (section- and row-scoped; each clause verified to fail against the current files); AC3 is the test oracle; AC4 is prose-review at PR time.
- Full gates (`npm test`, `npm run typecheck`, `npm run build`) stay green.

## Definition of Done
- [ ] `npm run typecheck`, `npm test`, `npm run build` green
- [ ] AC1/AC2 command oracles and the AC3 test oracle pass; AC4 walked at review
- [ ] All edits in English; no Markdown beyond F1/F2 and the `.marvin/task/` lifecycle artifacts touched
- [ ] Delivery PR targets `dev` per the branch workflow

## Non-goals
- Rewriting item 5's content or designing the Legend/ValueLegend reconciliation — that revision is the next task, seeded by item 5's banner
- Editing `specs/design-system-tokens.json` — its two `chart.line` entries are known-superseded (recorded in the item 2/3 banners); reconciling the token record happens through the DesignSync/design-project flow as a named follow-up, not by repo-side edits
- Re-auditing the seven §A5 rows this refresh does not touch (bar, scatter, treemap, heatmap, stat-panel, dashboard, map) — named follow-up if live QA surfaces drift there
- Editing `README.md` (already updated by spec 004), `.design-sync/conventions.md`, or `.design-sync/entry.tsx`
- Any widget code or payload change

## Assumptions
- Item 2 is attributed to redesign commit `b11de90` — no spec or dedicated PR exists for it; the commit ref is the honest citation. Item 3 is attributed to both b11de90 (end dots) and spec 003 / PR #43 (start caps), matching 003's own record.
- PR numbers 42/43/44 taken from the merge history of `dev`; spec links point at the sibling `.marvin/task/` files.
- The schema-derived pin asserts property-name presence (word-boundary match), not type equivalence — tight enough to catch a forgotten property (the observed failure mode), loose enough to survive rewording around the names. Type-level equivalence remains V2 territory.

## Open Questions
none

## Security / NFR
N/A — documentation edits plus a read-only test; no auth, network, or PII surface; the only parsing is JSON.parse of a tracked repo file. Nothing ships in widget bundles.

## Critic Verdict & Overrides
Round 1: BLOCK — five blockers (false tokens-current claim; non-shipped behavior prescribed into TESTING.md; wrong item 2/3 banner facts and item 3 attribution; non-discriminating AC2 greps; a drift pin that could not catch payload-side drift) and four warnings (fonts footnote queued by 002 uncovered; false values inside touched §A5 rows; AC1 footer marker collision; AC1 placement-blindness). All addressed: facts re-verified in code, oracles re-scoped, pin redesigned schema-derived.

Round 2: PASS WITH WARNINGS — blockers cleared, disposition re-verified empirically by the critic (all AC1/AC2 clauses re-run and shown to fail against the current files; the pin simulated by execution, reproducing exactly the two historical drifts with zero false failures across all ten Views; AC1 sed ranges verified against the real headings, including the b11de90/pull-43 co-existence in adjacent ranges). All six round-2 warnings folded into this sealed text: the Goal names the token-JSON re-route, the pin matcher is word-boundary, the @fontsource clause is section-scoped, the AC2 tokens tightened to "Other"/cap dot, the table row's "tick font" naming is corrected in passing, and the legend citation points at the behavioral lines. No overrides.

## Design Notes
- The item 2/3 banners double as the supersession record for the two stale token values — the followups doc quotes those tokens, so the banner is where a reader meets the stale claim.
- The footer's status summary deliberately avoids the ✅ marker; the AC1 count check depends on exactly four occurrences (same reasoning as item 5's ⏳ marker).
- AC1's command oracle proves banner presence and placement; the "sketches verbatim" half of the record rides on AC4's prose review — the split is deliberate (verbatim-ness is not greppable).
- The F4 schema walk goes exactly one level into array-item object schemas — deep enough to catch nested column/datum properties (the kind class of drift), shallow enough to stay a name check. The rows record schema has no fixed property names; the targeted number-array assert covers its cell union (the walk yields no rows entries, which is why both asserts are kept).
- F4's per-name matcher is a word-boundary regex (name, optional question mark, colon) — critic-verified to produce identical results to the substring form today while closing the one-letter-property false-pass class (x/y in heatmap, scatter, map).
- F4 imports `createServer`/`WIDGETS` read-only; no source file changes. The View key is derived (pascal-case + "View"), not read from `titleMap`, so the test does not couple to Storybook naming.

## Future Considerations
- Item 5 revision (`ValueLegend` vs the sketch's `Legend.tsx`) — the last open design-system item.
- Token-record reconciliation (`area-fill` dark split, `end-cap-radius` per-series split) through the DesignSync/design-project flow — this entry supersedes the token-JSON queue pointers in spec 003 (line 163, "a separate docs task") and spec 004 (Future Considerations, "token JSON"), which routed here.
- Full §A5 re-audit of the remaining seven widget rows if live QA reports drift.
- If config drift recurs despite the schema-derived pin, escalate to V2 (compiled dts verification).
- The stat-panel/table shared-sparkline consolidation noted in spec 004 remains parked.
