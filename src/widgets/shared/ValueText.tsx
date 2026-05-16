import type { CSSProperties, PropsWithChildren } from "react";

export type ValueScale = "value" | "value-sm" | "value-inline";

const VARS: Record<ValueScale, { family: string; size: string; lh: string; weight: string }> = {
  value: {
    family: "var(--sigil-font-value-family)",
    size: "var(--sigil-font-value-size)",
    lh: "var(--sigil-font-value-line-height)",
    weight: "var(--sigil-font-value-weight)",
  },
  "value-sm": {
    family: "var(--sigil-font-value-sm-family)",
    size: "var(--sigil-font-value-sm-size)",
    lh: "var(--sigil-font-value-sm-line-height)",
    weight: "var(--sigil-font-value-sm-weight)",
  },
  "value-inline": {
    family: "var(--sigil-font-value-inline-family)",
    size: "var(--sigil-font-value-inline-size)",
    lh: "var(--sigil-font-value-inline-line-height)",
    weight: "var(--sigil-font-value-inline-weight)",
  },
};

interface ValueTextProps {
  scale?: ValueScale;
  style?: CSSProperties;
}

export function ValueText({
  scale = "value-inline",
  style,
  children,
}: PropsWithChildren<ValueTextProps>) {
  const v = VARS[scale];
  return (
    <span
      style={{
        fontFamily: v.family,
        fontSize: v.size,
        lineHeight: v.lh,
        fontWeight: v.weight as unknown as number,
        fontVariantNumeric: "tabular-nums",
        color: "var(--sigil-text)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
