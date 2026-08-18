import type { CSSProperties, PropsWithChildren } from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardElevation = "none" | "low" | "mid" | "high";
export type CardSurface = "surface" | "sunken" | "elevated";

const PADDING: Record<CardPadding, string> = {
  none: "0",
  sm: "var(--sigil-space-sm)",
  md: "var(--sigil-space-md)",
  lg: "var(--sigil-space-lg)",
};

const ELEVATION: Record<CardElevation, string | undefined> = {
  // Undefined rather than "none": React drops the declaration entirely, so a
  // card that wants its shadow from a stylesheet (a :hover lift, say) can have
  // one. An inline "none" would outrank any class rule.
  none: undefined,
  low: "var(--sigil-shadow-low)",
  mid: "var(--sigil-shadow-mid)",
  high: "var(--sigil-shadow-high)",
};

const SURFACE: Record<CardSurface, string> = {
  surface: "var(--sigil-surface)",
  sunken: "var(--sigil-surface-sunken)",
  elevated: "var(--sigil-surface-elevated)",
};

interface CardProps {
  padding?: CardPadding;
  elevation?: CardElevation;
  /** Which surface token the card paints. Defaults to `surface`; a nested card
   *  can use `sunken` to recede against its parent surface. */
  surface?: CardSurface;
  bordered?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  padding = "lg",
  elevation = "low",
  surface = "surface",
  bordered = true,
  className,
  style,
  children,
}: PropsWithChildren<CardProps>) {
  return (
    <div
      className={className}
      style={{
        background: SURFACE[surface],
        border: bordered ? "1px solid var(--sigil-border-subtle)" : "none",
        borderRadius: "var(--sigil-radius-lg)",
        padding: PADDING[padding],
        boxShadow: ELEVATION[elevation],
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
