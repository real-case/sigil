// The focus/mute state every legend-bearing chart carries.
//
// `ValueLegend` already shares the chrome; this is the state machine behind it,
// which was written out four times — line, bar, pie, scatter — byte-identical
// apart from one constant. Each new chart type would have added a fifth.
//
// The decision logic is pure and exported separately from the hook: this repo's
// test environment is `node` with no DOM, so a hook's behaviour is only
// reachable through a render. Keeping the rules as functions makes focus, mute
// and their precedence directly testable, and leaves the hook a thin `useState`
// wrapper over them.

import { useState } from "react";

/** A muted series is dimmed hardest, and identically in every widget. */
export const MUTED_OPACITY = 0.18;

export interface LegendSelection {
  /** Index the pointer is over, or null. */
  readonly focused: number | null;
  /** Indices the viewer has clicked off. */
  readonly muted: ReadonlySet<number>;
}

/**
 * Opacity for one index. Muting wins over focus: a series the viewer switched
 * off stays off while the pointer wanders, rather than brightening under it.
 */
export function legendOpacity(
  index: number,
  selection: LegendSelection,
  unfocusedOpacity: number,
): number {
  if (selection.muted.has(index)) return MUTED_OPACITY;
  if (selection.focused !== null && selection.focused !== index) {
    return unfocusedOpacity;
  }
  return 1;
}

/** The mute set with `index` flipped. Never mutates the set it is given. */
export function toggleMuted(
  muted: ReadonlySet<number>,
  index: number,
): ReadonlySet<number> {
  const next = new Set(muted);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}

export interface LegendState extends LegendSelection {
  setFocused: (index: number | null) => void;
  toggleMute: (index: number) => void;
  opacityFor: (index: number) => number;
  /** Clear both, for a widget that resets when its payload changes. */
  reset: () => void;
}

/**
 * @param unfocusedOpacity how far the *other* series dim while one is focused.
 *   A parameter rather than a constant because the widgets genuinely differ —
 *   0.2 where marks are thin lines or points, 0.32 where they are filled areas
 *   — and normalising them here would be a visual change, not a refactor.
 */
export function useLegendState({
  unfocusedOpacity,
}: {
  unfocusedOpacity: number;
}): LegendState {
  const [focused, setFocused] = useState<number | null>(null);
  const [muted, setMuted] = useState<ReadonlySet<number>>(new Set());

  return {
    focused,
    muted,
    setFocused,
    toggleMute: (index) => setMuted((prev) => toggleMuted(prev, index)),
    opacityFor: (index) => legendOpacity(index, { focused, muted }, unfocusedOpacity),
    reset: () => {
      // Keeps the existing set when it is already empty, so a payload swap on
      // an untouched chart does not hand consumers a new reference.
      setMuted((prev) => (prev.size ? new Set() : prev));
      setFocused(null);
    },
  };
}
