import { useCallback, useRef, useState, type KeyboardEvent, type RefCallback } from "react";

/**
 * Keyboard navigation for a set of chart marks (heatmap cells, map regions,
 * treemap tiles).
 *
 * The marks form *one* composite widget, not hundreds of tab stops: exactly one
 * mark carries `tabIndex={0}` and every other carries `-1`, so a single Tab
 * enters the chart and a single Tab leaves it. Inside, the arrow keys move the
 * tab stop (and the real DOM focus) from mark to mark, Home/End jump to the
 * ends, and Enter/Space does whatever a click does. This is the roving-tabindex
 * pattern; putting `tabIndex={0}` on every cell instead would bury a 400-cell
 * heatmap's neighbouring content behind 400 presses of Tab.
 *
 * Pass `columns` for a matrix — Left/Right then walk a row and Up/Down walk a
 * column, with Home/End bound to the row ends and Ctrl+Home/End to the whole
 * grid. Omit it for an unordered set (map regions, treemap tiles), where every
 * arrow key simply steps through the marks in render order.
 */

type Focusable = SVGElement | HTMLElement;

export interface RovingFocus<E extends Focusable> {
  /** The mark that currently owns the widget's single tab stop. */
  activeIndex: number;
  /** Props for mark `index`: ref registration, tab stop, and key handling. */
  itemProps(index: number): {
    ref: RefCallback<E>;
    tabIndex: number;
    onFocus: () => void;
    onKeyDown: (event: KeyboardEvent) => void;
  };
}

export interface RovingFocusOptions {
  /** Number of marks in the widget. */
  count: number;
  /** Marks per row, for two-dimensional movement. Omit for a flat set. */
  columns?: number;
  /** Enter/Space on the active mark — the keyboard equivalent of a click. */
  onActivate?: (index: number) => void;
}

export function useRovingFocus<E extends Focusable>({
  count,
  columns,
  onActivate,
}: RovingFocusOptions): RovingFocus<E> {
  const [rawActive, setRawActive] = useState(0);
  // The payload can shrink under us (a new tool result, a smaller matrix), so
  // never hand back an index the caller can no longer render.
  const activeIndex = count === 0 ? 0 : Math.min(rawActive, count - 1);

  const nodes = useRef(new Map<number, E>());
  const refCallbacks = useRef(new Map<number, RefCallback<E>>());

  const focusIndex = useCallback((index: number) => {
    setRawActive(index);
    nodes.current.get(index)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (count === 0) return;
      const current = Math.min(rawActive, count - 1);
      const cols = columns && columns > 0 ? columns : 0;
      const row = cols ? Math.floor(current / cols) : 0;
      const lastRowStart = cols ? Math.floor((count - 1) / cols) * cols : 0;
      let next = current;

      switch (event.key) {
        case "ArrowRight":
          next = current + 1;
          // In a matrix Right walks the row and stops at its end; in a flat set
          // it is just "the next mark".
          if (cols && next >= (row + 1) * cols) next = current;
          break;
        case "ArrowLeft":
          next = current - 1;
          if (cols && next < row * cols) next = current;
          break;
        case "ArrowDown":
          next = current + (cols || 1);
          break;
        case "ArrowUp":
          next = current - (cols || 1);
          break;
        case "Home":
          next = cols && !event.ctrlKey && !event.metaKey ? row * cols : 0;
          break;
        case "End":
          next =
            cols && !event.ctrlKey && !event.metaKey
              ? Math.min((row + 1) * cols - 1, count - 1)
              : count - 1;
          break;
        case "PageUp":
          next = cols ? current % cols : 0;
          break;
        case "PageDown":
          next = cols ? Math.min(lastRowStart + (current % cols), count - 1) : count - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onActivate?.(current);
          return;
        default:
          return;
      }

      event.preventDefault();
      if (next < 0 || next >= count || next === current) return;
      focusIndex(next);
    },
    [columns, count, focusIndex, onActivate, rawActive],
  );

  const itemProps = useCallback(
    (index: number) => {
      let ref = refCallbacks.current.get(index);
      if (!ref) {
        // Cached so the callback identity is stable — a fresh closure per render
        // would detach and reattach every mark on every render.
        ref = (el: E | null) => {
          if (el) nodes.current.set(index, el);
          else nodes.current.delete(index);
        };
        refCallbacks.current.set(index, ref);
      }
      return {
        ref,
        tabIndex: index === activeIndex ? 0 : -1,
        onFocus: () => setRawActive(index),
        onKeyDown: handleKeyDown,
      };
    },
    [activeIndex, handleKeyDown],
  );

  return { activeIndex, itemProps };
}
