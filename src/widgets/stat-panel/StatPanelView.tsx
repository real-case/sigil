import type { StatItem, StatPanelPayload, StatStatus } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Card } from "../shared/Card.js";
import { useEmbedded } from "../shared/embedded.js";
import { ValueText } from "../shared/ValueText.js";
import { Toolbar, ToolbarButton, CsvIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { toCsv, copyText, type CsvCell } from "../shared/export-utils.js";

const NUMBER_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
const DELTA_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const CARD_MIN_WIDTH = 168;

type DeltaTone = "success" | "danger" | "muted";

function formatValue(value: string | number): string {
  return typeof value === "number" ? NUMBER_FMT.format(value) : value;
}

function deltaTone(delta: number, higherIsBetter: boolean): DeltaTone {
  if (delta === 0) return "muted";
  const good = higherIsBetter ? delta > 0 : delta < 0;
  return good ? "success" : "danger";
}

const TONE_COLOR: Record<DeltaTone, string> = {
  success: "var(--sigil-success-text)",
  danger: "var(--sigil-danger-text)",
  muted: "var(--sigil-text-muted)",
};

function statusAccent(status: StatStatus): string {
  return `var(--sigil-${status}-text)`;
}

function badgeStyle(status: StatStatus | undefined): {
  background: string;
  color: string;
  border: string;
} {
  if (!status) {
    return {
      background: "var(--sigil-surface-sunken)",
      color: "var(--sigil-text-secondary)",
      border: "1px solid var(--sigil-border-default)",
    };
  }
  return {
    background: `var(--sigil-${status}-surface)`,
    color: `var(--sigil-${status}-text)`,
    border: `1px solid var(--sigil-${status}-border)`,
  };
}

// Compact area+line sparkline. The viewBox is stretched to the card width
// (preserveAspectRatio="none"); a non-scaling stroke keeps the line crisp and
// the end marker is omitted so the horizontal stretch can't distort it.
function Sparkline({
  values,
  color,
  gradientId,
  label,
}: {
  values: number[];
  color: string;
  gradientId: string;
  label: string;
}) {
  const W = 100;
  const H = 28;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - pad * 2);
  const pts = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `M ${x(0).toFixed(2)},${H} L ${pts.join(" L ")} L ${x(n - 1).toFixed(2)},${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
      role="img"
      // The trend series appears nowhere else on the card, so the sparkline is
      // the only place it exists — name it after the metric it belongs to and
      // spell out the span it draws, rather than hiding it from assistive tech.
      aria-label={`${label} trend: ${n} points, ${NUMBER_FMT.format(values[0]!)} to ${NUMBER_FMT.format(values[n - 1]!)}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.26} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function StatCard({
  item,
  tokens,
  index,
}: {
  item: StatItem;
  tokens: ChartDesignTokens;
  index: number;
}) {
  // Inside a dashboard tile (itself a surface) recede the card to a sunken well
  // so it doesn't read as surface-on-surface; standalone it stays raised.
  const embedded = useEmbedded();
  const {
    label,
    value,
    unit,
    delta,
    deltaUnit = "%",
    deltaCaption,
    higherIsBetter = true,
    description,
    status,
    trend,
    target,
    badge,
  } = item;

  const hasDelta = typeof delta === "number";
  const tone = hasDelta ? deltaTone(delta!, higherIsBetter) : "muted";
  const arrow = !hasDelta || delta === 0 ? "→" : delta! > 0 ? "▲" : "▼";

  const accentColor =
    hasDelta && tone !== "muted" ? TONE_COLOR[tone] : "var(--sigil-series-0)";
  const progressColor = status ? statusAccent(status) : "var(--sigil-series-0)";
  const hasTrend = Array.isArray(trend) && trend.length > 1;
  const hasTarget =
    typeof target === "number" && typeof value === "number" && target !== 0;
  const pct = hasTarget
    ? Math.max(0, Math.min(100, (value / target!) * 100))
    : 0;

  const labelStyle = {
    fontFamily: tokens.typography.family.mono,
    fontSize: tokens.typography.scale.tick.fontSize,
    letterSpacing: `${tokens.typography.scale.tick.letterSpacing}em`,
    textTransform: "uppercase" as const,
    color: tokens.texts.muted,
  };

  return (
    <Card
      padding="lg"
      surface={embedded ? "sunken" : "surface"}
      // The raised-on-hover lift is a decoration with nothing behind it, so it
      // belongs in the stylesheet rather than in React state — see
      // `.sigil-stat-card` in styles.css. Card leaves box-shadow to CSS here.
      elevation="none"
      className={`sigil-stat-card${embedded ? " is-embedded" : ""}`}
      style={{
        position: "relative",
        overflow: "hidden",
        borderLeft: status ? `3px solid ${statusAccent(status)}` : undefined,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={labelStyle}>{label}</span>
          {badge && (
            <span
              style={{
                ...badgeStyle(status),
                flexShrink: 0,
                padding: "1px 7px",
                borderRadius: "var(--sigil-radius-full)",
                fontFamily: tokens.typography.family.sans,
                fontSize: tokens.typography.scale.tick.fontSize,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
          <ValueText scale="value">{formatValue(value)}</ValueText>
          {unit && (
            <span
              style={{
                fontFamily: tokens.typography.family.sans,
                fontSize: tokens.typography.scale.label.fontSize,
                color: tokens.texts.muted,
              }}
            >
              {unit}
            </span>
          )}
        </div>

        {hasDelta && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 3,
                color: TONE_COLOR[tone],
                fontFamily: tokens.typography.family.mono,
                fontSize: tokens.typography.scale.valueInline.fontSize,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 500,
              }}
            >
              <span aria-hidden style={{ fontSize: "0.8em" }}>
                {arrow}
              </span>
              {delta! > 0 ? "+" : ""}
              {DELTA_FMT.format(delta!)}
              {deltaUnit}
            </span>
            {deltaCaption && (
              <span
                style={{
                  fontFamily: tokens.typography.family.sans,
                  fontSize: tokens.typography.scale.tick.fontSize,
                  color: tokens.texts.muted,
                }}
              >
                {deltaCaption}
              </span>
            )}
          </div>
        )}

        {hasTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: "var(--sigil-radius-full)",
                // On a sunken (embedded) card the sunken track would vanish;
                // use the surface token so it stays a visible groove.
                background: embedded ? "var(--sigil-surface)" : "var(--sigil-surface-sunken)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: progressColor,
                  borderRadius: "var(--sigil-radius-full)",
                  transition:
                    "width var(--sigil-duration-base) var(--sigil-easing-standard)",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: tokens.typography.family.mono,
                fontSize: tokens.typography.scale.tick.fontSize,
                fontVariantNumeric: "tabular-nums",
                color: tokens.texts.muted,
              }}
            >
              {Math.round(pct)}% of {NUMBER_FMT.format(target!)}
              {unit ? (unit === "%" ? unit : ` ${unit}`) : ""}
            </span>
          </div>
        )}

        {hasTrend && (
          <Sparkline
            values={trend!}
            color={accentColor}
            gradientId={`sigil-spark-${index}`}
            label={label}
          />
        )}

        {description && (
          <span
            style={{
              fontFamily: tokens.typography.family.sans,
              fontSize: tokens.typography.scale.label.fontSize,
              lineHeight: `${tokens.typography.scale.label.lineHeight}px`,
              color: tokens.texts.secondary,
            }}
          >
            {description}
          </span>
        )}
      </div>
    </Card>
  );
}

export function StatPanelView({ payload }: { payload: StatPanelPayload }) {
  const tokens = useTheme();
  const { title, items, columns } = payload;

  if (items.length === 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No metrics to display" description="The payload was empty." />
      </div>
    );
  }

  const copyCsv = () =>
    copyText(
      toCsv(
        ["metric", "value", "unit", "delta"],
        items.map((it): CsvCell[] => [
          it.label,
          it.value,
          it.unit ?? "",
          typeof it.delta === "number" ? it.delta : "",
        ]),
      ),
    );

  const gridTemplateColumns = columns
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${CARD_MIN_WIDTH}px, 1fr))`;

  return (
    <div className="sigil-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
        </Toolbar>
      </div>
      <div style={{ display: "grid", gridTemplateColumns, gap: tokens.spacing.md }}>
        {items.map((item, i) => (
          <StatCard key={`${item.label}-${i}`} item={item} tokens={tokens} index={i} />
        ))}
      </div>
    </div>
  );
}
