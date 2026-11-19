import type { CSSProperties } from "react";
import type { InfoCardItem, InfoCardPayload } from "../../shared/payloads.js";
import { useTheme, seriesColor, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon } from "../shared/Toolbar.js";
import { EmptyState } from "../shared/EmptyState.js";
import { ValueLegend } from "../shared/ValueLegend.js";
import { fmtNumber, fmtShare } from "../shared/chart-text.js";
import { toCsv, copyText, type CsvCell } from "../shared/export-utils.js";
import {
  bandRanges,
  changeOf,
  ofTarget,
  place,
  rankMove,
  scaleOf,
  statusOf,
  type Placement,
  type Scale,
  type Status,
} from "./info-card-math.js";

const NO_MUTED: ReadonlySet<number> = new Set();
const noop = () => {};

const HUGGING_UNITS = new Set(["%", "×", "x"]);

/** "840", "99.2%", "3.4×", "312 ms" — % and × hug the number, other units follow a space. */
export function fmtValue(value: number, unit?: string): string {
  const n = fmtNumber(value);
  if (!unit) return n;
  return HUGGING_UNITS.has(unit) ? `${n}${unit}` : `${n} ${unit}`;
}

const pct = (p: number) => `${(p * 100).toFixed(2)}%`;

function StatusText({ status }: { status: Status }) {
  return (
    <span className="sigil-ic-status" data-tone={status.tone}>
      <i aria-hidden="true" />
      {status.text}
    </span>
  );
}

/** "above scale (max 100)" — said whenever a value had to be pinned to an edge. */
function OffScale({ placement, scale, unit }: { placement: Placement; scale: Scale; unit?: string }) {
  if (!placement.off) return null;
  return (
    <span className="sigil-ic-off">
      {placement.off === "above"
        ? `above scale (max ${fmtValue(scale.max, unit)})`
        : `below scale (min ${fmtValue(scale.min, unit)})`}
    </span>
  );
}

function targetNote(item: InfoCardItem): string | null {
  const share = ofTarget(item.value, item.target);
  if (share === null || item.target === undefined) return null;
  return `${fmtShare(share)} of target ${fmtValue(item.target, item.unit)}`;
}

// ----- bullet & progress ------------------------------------------------------

function LinearItem({
  item,
  variant,
  tokens,
}: {
  item: InfoCardItem;
  variant: "bullet" | "progress";
  tokens: ChartDesignTokens;
}) {
  // A progress bar runs to its target unless the payload sets a max: "how
  // close to the goal" is the whole question.
  const toTarget =
    variant === "progress" && item.max === undefined && item.target !== undefined && item.target > (item.min ?? 0);
  const scale = toTarget ? { min: item.min ?? 0, max: item.target! } : scaleOf(item);
  const at = place(item.value, scale);
  // Bars grow from zero when zero is on the scale, so a negative value reads
  // as one.
  const zero = place(0, scale);
  const origin = zero.off ? 0 : zero.pos;
  const from = Math.min(origin, at.pos);
  const to = Math.max(origin, at.pos);
  const status = statusOf(item);
  const target = item.target !== undefined && variant === "bullet" ? place(item.target, scale) : null;
  const up = item.higherIsBetter ?? true;
  const ranges = variant === "bullet" && item.bands ? bandRanges(item.bands, scale) : [];
  const note = targetNote(item);
  const barColor = status && variant === "progress" ? `var(--sigil-${status.tone}-text)` : seriesColor(tokens, 0);

  return (
    <li className="sigil-ic-row">
      <div className="sigil-ic-head">
        <span className="sigil-ic-label">{item.label}</span>
        <span className="sigil-ic-value">{fmtValue(item.value, item.unit)}</span>
      </div>
      <div
        className={`sigil-ic-track sigil-ic-track--${variant}`}
        aria-hidden="true"
      >
        {ranges.map(([lo, hi], i) => {
          // The worst range is the darkest, as in a classic bullet graph.
          const rank = up ? i : ranges.length - 1 - i;
          const strength = 30 - (rank * 22) / Math.max(1, ranges.length - 1);
          return (
            <i
              key={i}
              className="sigil-ic-band"
              style={{
                left: pct(place(lo, scale).pos),
                width: pct(place(hi, scale).pos - place(lo, scale).pos),
                background: `color-mix(in oklab, var(--sigil-text-muted) ${strength.toFixed(0)}%, var(--sigil-surface-sunken))`,
              }}
            />
          );
        })}
        <i
          className={`sigil-ic-bar${at.off ? ` is-off-${at.off}` : ""}`}
          // backgroundColor, not the shorthand: the off-scale hatch is a
          // background-image from the stylesheet and must survive this.
          style={{
            left: pct(from),
            width: pct(Math.max(to - from, 0.004)),
            backgroundColor: barColor,
            color: barColor,
          }}
        />
        {target && <i className="sigil-ic-target" style={{ left: pct(target.pos) }} />}
      </div>
      <div className="sigil-ic-foot">
        {note && <span>{note}</span>}
        {status && <StatusText status={status} />}
        {/* A progress bar that ends at its target is past the end exactly
            when the target is beaten, which "of target" already says. */}
        {!(toTarget && at.off === "above") && <OffScale placement={at} scale={scale} unit={item.unit} />}
        {item.caption && <span className="sigil-ic-caption">{item.caption}</span>}
      </div>
    </li>
  );
}

// ----- gauge -----------------------------------------------------------------

const G = { cx: 100, cy: 96, r: 76, stroke: 14, zoneR: 90, zoneStroke: 4 };

const polar = (p: number, r: number) => {
  const a = Math.PI * (1 - p);
  return { x: G.cx + r * Math.cos(a), y: G.cy - r * Math.sin(a) };
};

/** Arc from scale position `p0` to `p1` (0..1, left to right over the top). */
function arc(p0: number, p1: number, r: number): string {
  const a = polar(p0, r);
  const b = polar(p1, r);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function gaugeZones(item: InfoCardItem, scale: Scale): { from: number; to: number; tone: Status["tone"] }[] {
  if (!item.thresholds) return [];
  const { warn, critical } = item.thresholds;
  const up = item.higherIsBetter ?? true;
  const raw = up
    ? [
        { from: scale.min, to: critical, tone: "danger" as const },
        { from: critical, to: warn, tone: "warning" as const },
        { from: warn, to: scale.max, tone: "success" as const },
      ]
    : [
        { from: scale.min, to: warn, tone: "success" as const },
        { from: warn, to: critical, tone: "warning" as const },
        { from: critical, to: scale.max, tone: "danger" as const },
      ];
  return raw
    .map((z) => ({ from: place(z.from, scale).pos, to: place(z.to, scale).pos, tone: z.tone }))
    .filter((z) => z.to > z.from);
}

function GaugeItem({ item, tokens }: { item: InfoCardItem; tokens: ChartDesignTokens }) {
  const scale = scaleOf(item);
  const at = place(item.value, scale);
  const status = statusOf(item);
  const zones = gaugeZones(item, scale);
  const target = item.target !== undefined ? place(item.target, scale) : null;
  const color = status ? `var(--sigil-${status.tone}-text)` : seriesColor(tokens, 0);
  const note = targetNote(item);
  const tick = (p: number) => {
    const a = polar(p, G.r - G.stroke / 2 - 3);
    const b = polar(p, G.r + G.stroke / 2 + 3);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  };
  const edge = polar(at.pos, G.r);

  return (
    <li className="sigil-ic-gauge">
      <svg viewBox="0 0 200 118" className="sigil-ic-dial" aria-hidden="true">
        {zones.map((z) => (
          <path
            key={z.tone}
            d={arc(z.from, z.to, G.zoneR)}
            fill="none"
            stroke={`var(--sigil-${z.tone}-text)`}
            strokeOpacity={0.55}
            strokeWidth={G.zoneStroke}
          />
        ))}
        <path
          d={arc(0, 1, G.r)}
          fill="none"
          stroke={tokens.surfaces.surfaceSunken}
          strokeWidth={G.stroke}
          strokeLinecap="round"
        />
        {at.pos > 0 && (
          <path
            d={arc(0, at.pos, G.r)}
            fill="none"
            stroke={color}
            strokeWidth={G.stroke}
            strokeLinecap="round"
          />
        )}
        {at.off && (
          // Pinned to the edge: a ring at the end of the arc says "and beyond".
          <circle
            cx={edge.x}
            cy={edge.y}
            r={G.stroke / 2 + 2}
            fill="none"
            stroke={tokens.texts.primary}
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
        )}
        {target && <line {...tick(target.pos)} stroke={tokens.texts.primary} strokeWidth={2} />}
        <text
          x={G.cx}
          y={G.cy - 14}
          textAnchor="middle"
          className="sigil-ic-dial-value"
          fill={tokens.texts.primary}
        >
          {fmtValue(item.value, item.unit)}
        </text>
        <text x={polar(0, G.r).x} y={G.cy + 18} textAnchor="middle" className="sigil-ic-dial-end">
          {fmtNumber(scale.min)}
        </text>
        <text x={polar(1, G.r).x} y={G.cy + 18} textAnchor="middle" className="sigil-ic-dial-end">
          {fmtNumber(scale.max)}
        </text>
      </svg>
      <div className="sigil-ic-label">{item.label}</div>
      <div className="sigil-ic-foot sigil-ic-foot--center">
        {status && <StatusText status={status} />}
        <OffScale placement={at} scale={scale} unit={item.unit} />
        {note && <span>{note}</span>}
        {item.caption && <span className="sigil-ic-caption">{item.caption}</span>}
      </div>
    </li>
  );
}

// ----- comparison ------------------------------------------------------------

function ComparisonItem({
  item,
  currentLabel,
  baselineLabel,
}: {
  item: InfoCardItem;
  currentLabel: string;
  baselineLabel: string;
}) {
  const baseline = item.baseline ?? 0;
  const change = changeOf(item.value, baseline, item.higherIsBetter ?? true);
  const sign = change.delta > 0 ? "+" : change.delta < 0 ? "−" : "";
  const glyph = change.delta > 0 ? "▲" : change.delta < 0 ? "▼" : "–";
  // A change of a percentage is in percentage points, not percent.
  const abs =
    item.unit === "%"
      ? `${fmtNumber(Math.abs(change.delta))} pp`
      : fmtValue(Math.abs(change.delta), item.unit);
  const rel = change.ratio === null ? null : fmtShare(Math.abs(change.ratio));
  return (
    <li className="sigil-ic-cmp">
      <div className="sigil-ic-label">{item.label}</div>
      <div className="sigil-ic-cmp-value">
        <span className="sigil-sr-only">{currentLabel}: </span>
        {fmtValue(item.value, item.unit)}
      </div>
      <div className="sigil-ic-cmp-change" data-tone={change.tone ?? "muted"}>
        <span aria-hidden="true">{glyph} </span>
        {rel !== null ? `${sign}${rel}` : `${sign}${abs}`}
        {rel !== null && <span className="sigil-ic-cmp-abs"> ({sign}{abs})</span>}
        {change.tone && (
          <span className="sigil-sr-only">{change.tone === "success" ? ", better" : ", worse"}</span>
        )}
      </div>
      <div className="sigil-ic-caption">
        vs {baselineLabel} {fmtValue(baseline, item.unit)}
      </div>
      {item.caption && <div className="sigil-ic-caption">{item.caption}</div>}
    </li>
  );
}

// ----- view ------------------------------------------------------------------

/**
 * `render_info_card`: one value in context. Each variant is a list of items
 * (narrative: text plus optional key figures), and every graphic is
 * decorative — the numbers, the target, the status and any off-scale flag are
 * printed as text beside it, so the card reads the same without the picture.
 */
export function InfoCardView({ payload }: { payload: InfoCardPayload }) {
  const tokens = useTheme();
  const { title, variant } = payload;
  const items = payload.items ?? [];

  if (items.length === 0 && !(variant === "narrative" && payload.text)) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const copyCsv = () => {
    const header = ["label", "value", "unit", "target", "baseline", "status"];
    const body: CsvCell[][] = items.map((it) => [
      it.label,
      it.value,
      it.unit ?? "",
      it.target ?? "",
      it.baseline ?? "",
      statusOf(it)?.text ?? "",
    ]);
    return copyText(toCsv(header, body));
  };

  const header = (
    <ChartHeader title={title}>
      {items.length > 0 && (
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
        </Toolbar>
      )}
    </ChartHeader>
  );

  let body: React.ReactNode;
  switch (variant) {
    case "bullet":
    case "progress":
      body = (
        <ul className="sigil-ic-list" aria-label={title}>
          {items.map((item, i) => (
            <LinearItem key={`${item.label}-${i}`} item={item} variant={variant} tokens={tokens} />
          ))}
        </ul>
      );
      break;
    case "gauge":
      body = (
        <ul className="sigil-ic-grid sigil-ic-grid--gauge" aria-label={title}>
          {items.map((item, i) => (
            <GaugeItem key={`${item.label}-${i}`} item={item} tokens={tokens} />
          ))}
        </ul>
      );
      break;
    case "ranking": {
      const top = Math.max(0, ...items.map((it) => it.value));
      body = (
        <ValueLegend
          interactive={false}
          focused={null}
          muted={NO_MUTED}
          onFocus={noop}
          onToggleMute={noop}
          items={items.map((item, i) => {
            const move = rankMove(item.rankDelta);
            return {
              name: item.label,
              lead: String(i + 1),
              color: seriesColor(tokens, 0),
              value: fmtValue(item.value, item.unit),
              meter: top > 0 ? (Math.max(0, item.value) / top) * 100 : 0,
              note: move
                ? {
                    glyph: move.glyph === "–" ? "–" : `${move.glyph} ${Math.abs(item.rankDelta ?? 0)}`,
                    label: `, rank ${move.text}`,
                    tone:
                      (item.rankDelta ?? 0) > 0 ? "success" : (item.rankDelta ?? 0) < 0 ? "danger" : "muted",
                  }
                : undefined,
            };
          })}
        />
      );
      break;
    }
    case "comparison": {
      const currentLabel = payload.currentLabel ?? "Current";
      const baselineLabel = payload.baselineLabel ?? "Previous";
      body = (
        <>
          <div className="sigil-ic-caption sigil-ic-legend">
            {currentLabel} vs {baselineLabel}
          </div>
          <ul className="sigil-ic-grid" aria-label={`${title}, ${currentLabel} vs ${baselineLabel}`}>
            {items.map((item, i) => (
              <ComparisonItem
                key={`${item.label}-${i}`}
                item={item}
                currentLabel={currentLabel}
                baselineLabel={baselineLabel}
              />
            ))}
          </ul>
        </>
      );
      break;
    }
    case "narrative": {
      const paragraphs = (payload.text ?? "")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      body = (
        <div className="sigil-ic-narrative">
          {items.length > 0 && (
            <ul className="sigil-ic-figures" aria-label="Key figures">
              {items.map((item, i) => (
                <li key={`${item.label}-${i}`} style={{ "--c": seriesColor(tokens, 0) } as CSSProperties}>
                  <span className="sigil-ic-fig-value">{fmtValue(item.value, item.unit)}</span>
                  <span className="sigil-ic-label">{item.label}</span>
                  {item.caption && <span className="sigil-ic-caption">{item.caption}</span>}
                </li>
              ))}
            </ul>
          )}
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      );
      break;
    }
  }

  return (
    <div className="sigil-root">
      {header}
      {body}
    </div>
  );
}
