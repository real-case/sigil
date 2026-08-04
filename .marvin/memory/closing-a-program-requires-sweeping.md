---
id: closing-a-program-requires-sweeping
type: process
title: Closing a program requires sweeping adjacent records for live claims, not
  just the queued files
created: 2026-08-04
tags: docs, closure, reverse-deps, process, spec-authoring
source: design-system-closure
---

The design-system closure spec initially declared "no reverse-deps" for the followups doc after checking only path links — but SPEC.md's primitives table carried a present-tense claim ("Legend (deferred)… widgets currently use Recharts Legend") that was false and had never been triaged by any prior spec. Before declaring any program or feature closed, grep the whole repo for its distinctive names and status markers (here: wrapperStyle, "(deferred)", the item number) to find semantic references in files nobody queued; "kept as a design record" does not exempt a file whose sentences assert current state. Distinguish record framing (historical sketches under status banners — keep verbatim) from live claims (present-tense assertions — must be corrected).
