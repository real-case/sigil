---
id: raw-invisible-control-bytes-can-hide-in
type: gotcha
title: Raw invisible control bytes can hide in source literals and break
  exact-match edits
created: 2026-08-02
tags: widgets, table, filter, control-characters, tooling
source: table-sparkline-columns
---

TableView's filter haystack join contained a raw U+0001 byte — an earlier redesign commit accidentally de-escaped the original explicit unicode-escape literal, leaving a separator that renders invisibly in editors, diffs, and file reads, so exact-string edits fail with "not found" against text that looks identical. Diagnose with `od -c` or `cat -v` (and `git log -S` for the byte to find where it entered); fix by restoring the explicit escape form, which is runtime-identical. The separator itself is deliberate: joining cell texts with U+0001 stops filter terms from matching across cell boundaries — do not "clean it up" to an empty-string join.
