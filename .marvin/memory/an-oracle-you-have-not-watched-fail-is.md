---
id: an-oracle-you-have-not-watched-fail-is
type: process
title: An oracle you have not watched fail is not a proof
created: 2026-08-09
tags: testing, oracles, spec-authoring, verification, vitest
source: dashboard-tile-resilience
---

Spec 007 hit three separate oracle-blindness defects in one spec, each of which would have shipped a green suite over broken code: a gate command (`npm test`) that stayed green whether or not the change landed, because the vitest include glob never collected the new `.tsx`; a criterion satisfiable by a stub (`guard.ts` re-exporting from `App.js`, which passes under `environment: "node"` because `mountWidget` early-returns without `document`); and the headline behaviour change having no oracle at all, because its test rendered `DashboardView`, which never calls the guard that changed. A later fix to the first one re-broke itself — naming a `.ts` file alongside the `.tsx` in the filter makes vitest find something and exit 0 again.

**Why:** every one of these passes review by reading. They are only visible by running the oracle against code that does not have the fix. Adversarial review caught all three; a self-read checklist caught none.

**How to apply:** before accepting any acceptance criterion, break the implementation the way the criterion describes and confirm the named oracle goes red — then restore. Cheap (seconds per criterion) and it is the only check that distinguishes a proof from a restatement. Applies double to command oracles, where "the command exits 0" and "the thing was verified" are easy to conflate. This is the same discipline as the repo's existing rule that a new drift pin must be shown to fail before the fix.
