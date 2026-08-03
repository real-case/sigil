---
id: verify-documentation-claims-against
type: process
title: Verify documentation claims against code, never against sibling docs
created: 2026-08-03
tags: docs, verification, design-system, process, spec-authoring
source: design-system-docs-refresh
---

The docs-refresh spec initially claimed the design tokens were "verified current" after checking them against the followups doc — which quotes the same tokens, so the check was circular and wrong: two chart.line token values (area-fill dark split, per-series end-cap radii) never shipped. The spec critic caught it only by reading the shipped widget code. When reconciling any record (tokens, QA checklists, dts strings, README tables), grep the implementation constants and branches, not another document that inherited the same source; and when a doc must stay stale for ownership reasons (the tokens file belongs to the DesignSync design project), record the supersession where readers meet the stale claim instead of editing it.
