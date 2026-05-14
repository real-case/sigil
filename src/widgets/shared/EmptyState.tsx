import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  glyph?: ReactNode;
  variant?: "empty" | "error";
}

export function EmptyState({
  title,
  description,
  glyph,
  variant = "empty",
}: EmptyStateProps) {
  const isError = variant === "error";
  return (
    <div
      role={isError ? "alert" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        maxWidth: 280,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      {glyph !== undefined && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--sigil-radius-md)",
            background: isError
              ? "var(--sigil-danger-surface)"
              : "var(--sigil-surface-sunken)",
            border: `1px solid ${
              isError
                ? "var(--sigil-danger-border)"
                : "var(--sigil-border-subtle)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isError
              ? "var(--sigil-danger-text)"
              : "var(--sigil-text-secondary)",
            marginBottom: 12,
          }}
        >
          {glyph}
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--sigil-font-title-family)",
          fontSize: "var(--sigil-font-title-size)",
          lineHeight: "var(--sigil-font-title-line-height)",
          fontWeight: 500,
          color: isError ? "var(--sigil-danger-text)" : "var(--sigil-text)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {description !== undefined && (
        <div
          style={{
            fontFamily: "var(--sigil-font-label-family)",
            fontSize: "var(--sigil-font-label-size)",
            lineHeight: "var(--sigil-font-label-line-height)",
            color: "var(--sigil-text-muted)",
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
