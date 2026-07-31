---
id: widget-display-transforms-key-ui-state
type: convention
title: Widget display transforms key UI state on original data indices
created: 2026-07-30
tags: widgets, react, state, pie-chart, display-transform
source: pie-max-segments-other
---

When a widget View transforms its payload for display (pie's maxSegments collapse, any future treemap cap), interactive state (mute/focus) and palette colors must key on the ORIGINAL data index, not the display position — display indices shift between modes and colors would jump. Project origIndex-keyed state back to display indices at the ValueLegend boundary (it consumes display indices). Also: mountWidget and the sandbox render View without a React key, so per-payload UI state leaks across payload swaps — reset it in an effect keyed on the data reference, and guard state setters against needless allocations (an unconditional `setMuted(new Set())` re-renders every mount). See src/widgets/pie-chart/PieChartView.tsx and collapse.ts from spec 002.
