import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius = "var(--sigil-radius-sm)",
  style,
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, var(--sigil-surface-sunken) 0%, var(--sigil-border-subtle) 50%, var(--sigil-surface-sunken) 100%)",
        backgroundSize: "200% 100%",
        animation:
          "sigil-shimmer 1400ms var(--sigil-easing-linear) infinite",
        ...style,
      }}
    />
  );
}

export type LoadingVariant =
  | "bar"
  | "line"
  | "pie"
  | "table"
  | "scatter"
  | "treemap"
  | "heatmap"
  | "sankey"
  | "generic";

interface LoadingSkeletonProps {
  variant?: LoadingVariant;
  /** Optional title placeholder width; omit to skip. */
  titleWidth?: number;
}

export function LoadingSkeleton({
  variant = "generic",
  titleWidth = 120,
}: LoadingSkeletonProps) {
  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Skeleton width={titleWidth} height={18} />
      <div style={{ display: "flex", gap: 6 }}>
        <Skeleton width={64} height={22} />
        <Skeleton width={64} height={22} />
      </div>
    </div>
  );

  let body: React.ReactNode = <Skeleton height={180} />;

  if (variant === "bar") {
    const heights = [70, 110, 50, 140, 90, 60, 100];
    body = (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          height: 180,
        }}
      >
        {heights.map((h, i) => (
          <Skeleton key={i} width={26} height={h} />
        ))}
      </div>
    );
  } else if (variant === "pie") {
    body = (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 180,
        }}
      >
        <Skeleton width={140} height={140} radius="var(--sigil-radius-full)" />
      </div>
    );
  } else if (variant === "table") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={20} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {header}
      {body}
    </div>
  );
}
