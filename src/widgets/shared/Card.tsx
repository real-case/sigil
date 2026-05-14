import type { CSSProperties, PropsWithChildren } from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardElevation = "none" | "low" | "mid" | "high";

const PADDING: Record<CardPadding, string> = {
  none: "0",
  sm: "var(--sigil-space-sm)",
  md: "var(--sigil-space-md)",
  lg: "var(--sigil-space-lg)",
};

const ELEVATION: Record<CardElevation, string> = {
  none: "none",
  low: "var(--sigil-shadow-low)",
  mid: "var(--sigil-shadow-mid)",
  high: "var(--sigil-shadow-high)",
};

interface CardProps {
  padding?: CardPadding;
  elevation?: CardElevation;
  bordered?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  padding = "lg",
  elevation = "low",
  bordered = true,
  className,
  style,
  children,
}: PropsWithChildren<CardProps>) {
  return (
    <div
      className={className}
      style={{
        background: "var(--sigil-surface)",
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
