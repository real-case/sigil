// The small menu a drill-down opens next to a chart mark.
//
// Why a menu rather than sending on click: a stray click must not put a
// message in the chat under the user's name, so the click only offers the
// questions and the user picks one (plan decision R4).
//
// Keyboard contract (WAI-ARIA menu pattern): opening moves focus to the first
// item; Up/Down/Home/End move between items; Enter/Space picks; Esc or Tab
// closes. Closing — by any route, including a pick — returns focus to whatever
// had it when the menu opened, which for a keyboard user is the mark itself.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  followUpActions,
  selectionContext,
  useFollowUp,
  type FollowUpMark,
} from "./follow-up.js";

/** Where the menu hangs: a viewport point, or an element to sit under. */
export type MenuAnchor = { x: number; y: number } | Element;

interface OpenMenu {
  mark: FollowUpMark;
  x: number;
  y: number;
}

export interface MarkMenuHandle {
  /**
   * Open the menu for `mark` at `anchor`, or null when the host cannot take a
   * follow-up message — the caller then keeps its old click behaviour.
   */
  open: ((mark: FollowUpMark, anchor: MenuAnchor) => void) | null;
  /** Render this somewhere inside the widget. Null while closed. */
  element: ReactNode;
}

const MENU_OFFSET = 6;
const MENU_WIDTH = 220;

function pointOf(anchor: MenuAnchor): { x: number; y: number } {
  if (!(anchor instanceof Element)) return anchor;
  const box = anchor.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.bottom };
}

/** Keep a `width`-wide box starting at `x` inside a `viewport`-wide frame. */
export function clampMenuX(x: number, width: number, viewport: number): number {
  return Math.max(4, Math.min(x, viewport - width - 4));
}

/**
 * Drill-down for one chart. `chart` is the chart's title, quoted into every
 * message; `followUps` is the payload's own menu, if it brought one.
 */
export function useMarkMenu(chart: string, followUps?: readonly string[]): MarkMenuHandle {
  const channel = useFollowUp();
  const [state, setState] = useState<OpenMenu | null>(null);
  const returnFocusRef = useRef<HTMLElement | SVGElement | null>(null);

  const open = useCallback(
    (mark: FollowUpMark, anchor: MenuAnchor) => {
      const active = typeof document !== "undefined" ? document.activeElement : null;
      const returnFocus =
        anchor instanceof HTMLElement || anchor instanceof SVGElement
          ? anchor
          : active instanceof HTMLElement || active instanceof SVGElement
            ? active === document.body
              ? null
              : active
            : null;
      const { x, y } = pointOf(anchor);
      returnFocusRef.current = returnFocus;
      setState({ mark, x, y });
      channel?.select(selectionContext(mark, chart));
    },
    [channel, chart],
  );

  const close = useCallback(() => {
    setState(null);
    // Focus after the menu unmounts, or the browser hands it to <body>.
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target) queueMicrotask(() => target.focus({ preventScroll: true }));
  }, []);

  const element =
    channel && state ? (
      <MarkMenu
        key={`${state.mark.label}@${state.x},${state.y}`}
        mark={state.mark}
        x={state.x}
        y={state.y}
        items={followUpActions(followUps).map((a) => ({
          label: a.label,
          onPick: () => {
            void channel.ask(a.text(state.mark, chart));
            close();
          },
        }))}
        onClose={close}
      />
    ) : null;

  return { open: channel ? open : null, element };
}

interface MarkMenuProps {
  mark: FollowUpMark;
  x: number;
  y: number;
  items: { label: string; onPick: () => void }[];
  onClose: () => void;
}

export function MarkMenu({ mark, x, y, items, onClose }: MarkMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [left, setLeft] = useState(x - MENU_WIDTH / 2);

  useLayoutEffect(() => {
    setLeft(clampMenuX(x - MENU_WIDTH / 2, MENU_WIDTH, window.innerWidth));
    itemRefs.current[0]?.focus({ preventScroll: true });
  }, [x]);

  // A press anywhere else closes the menu; the press itself still lands, so
  // clicking another mark closes this menu and opens that one.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);

  const move = (from: number, delta: number | "first" | "last") => {
    const n = items.length;
    const next =
      delta === "first" ? 0 : delta === "last" ? n - 1 : (from + delta + n) % n;
    itemRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    switch (e.key) {
      case "ArrowDown":
        move(current, 1);
        break;
      case "ArrowUp":
        move(current, -1);
        break;
      case "Home":
        move(current, "first");
        break;
      case "End":
        move(current, "last");
        break;
      case "Escape":
      case "Tab":
        onClose();
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={listRef}
      className="sigil-mark-menu"
      role="menu"
      aria-label={`Ask about ${mark.label}`}
      tabIndex={-1}
      style={{ left, top: y + MENU_OFFSET, width: MENU_WIDTH }}
      onKeyDown={onKeyDown}
    >
      <div className="sigil-mark-menu-head" aria-hidden="true">
        <span>{mark.label}</span>
        {mark.value ? <span className="sigil-mark-menu-value">{mark.value}</span> : null}
      </div>
      {items.map((item, i) => (
        <button
          key={item.label}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          className="sigil-mark-menu-item"
          onClick={item.onPick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
