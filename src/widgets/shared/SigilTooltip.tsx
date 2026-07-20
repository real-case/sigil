import { SeriesSwatch } from "./SeriesSwatch.js";
import { ValueText } from "./ValueText.js";

export interface TooltipRow {
  color?: string;
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  payload?: unknown;
}

interface SigilTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipRow[];
  /** Optional formatter; defaults to `String(value)`. */
  formatValue?: (value: number | string, row: TooltipRow) => string;
  /** Hide the header label entirely. */
  hideLabel?: boolean;
}

export function SigilTooltip({
  active,
  label,
  payload,
  formatValue,
  hideLabel = false,
}: SigilTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background:
          "color-mix(in oklab, var(--sigil-surface-elevated) 86%, transparent)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        border: "1px solid var(--sigil-border-default)",
        borderRadius: "var(--sigil-radius-md)",
        padding: "9px 11px",
        minWidth: 150,
        boxShadow: "var(--sigil-shadow-mid)",
        color: "var(--sigil-text)",
        fontFamily: "var(--sigil-font-tooltip-family)",
        fontSize: "var(--sigil-font-tooltip-size)",
        lineHeight: "var(--sigil-font-tooltip-line-height)",
        animation:
          "sigil-tooltip-enter var(--sigil-duration-base) var(--sigil-easing-standard)",
      }}
    >
      {!hideLabel && label !== undefined && (
        <div
          style={{
            fontFamily: "var(--sigil-font-axis-cap-family)",
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--sigil-text-muted)",
            marginBottom: 6,
            paddingBottom: 6,
            borderBottom: "1px solid var(--sigil-border-subtle)",
          }}
        >
          {String(label)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {payload.map((row, i) => {
          const value = row.value;
          const display =
            value === undefined
              ? "—"
              : formatValue
                ? formatValue(value, row)
                : String(value);
          return (
            <div
              key={`${String(row.dataKey ?? row.name ?? i)}`}
              style={{
                display: "grid",
                gridTemplateColumns: "9px minmax(0, 1fr) auto",
                alignItems: "center",
                gap: 9,
                padding: "2px 0",
                fontSize: 12.5,
              }}
            >
              <SeriesSwatch
                color={row.color ?? "var(--sigil-text-muted)"}
                shape="square"
                size={9}
              />
              <span
                style={{
                  color: "var(--sigil-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.name ?? String(row.dataKey ?? "")}
              </span>
              <ValueText scale="value-inline">{display}</ValueText>
            </div>
          );
        })}
      </div>
    </div>
  );
}
