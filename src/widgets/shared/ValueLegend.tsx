import type { CSSProperties, ReactNode } from "react";

export interface ValueLegendRange {
  /** Left edge of the min→max span, 0–100. */
  lo: number;
  /** Right edge of the min→max span, 0–100. */
  hi: number;
  /** Average marker position, 0–100. */
  avg: number;
}

export interface ValueLegendItem {
  name: string;
  color: string;
  /** Formatted primary value, e.g. "21,450". */
  value: string;
  /** Small muted suffix after the value, e.g. "40.5%" or "avg". */
  suffix?: string;
  /** Proportion meter fill 0–100 → renders the meter variant. */
  meter?: number;
  /** Min/avg/max positions → renders the compact range variant. */
  range?: ValueLegendRange;
  /** Shown in place of the swatch, e.g. a rank number ("1"). */
  lead?: string;
  /** A short marker after the value, e.g. a rank move "▲ 3". */
  note?: ValueLegendNote;
  /** Drawn in place of the colour swatch: a marker shape or line pattern, so
   *  the key shows the same secondary encoding as the marks. */
  glyph?: ReactNode;
}

export interface ValueLegendNote {
  /** What is drawn, e.g. "▲ 3". Hidden from assistive tech… */
  glyph: string;
  /** …which reads this instead, e.g. "up 3 places". */
  label: string;
  tone?: "success" | "danger" | "muted";
}

interface ValueLegendProps {
  items: ValueLegendItem[];
  /** "column" (default) for side placement, "row" for below the plot. */
  layout?: "column" | "row";
  /** Index currently hover-focused, or null. */
  focused: number | null;
  /** Indices toggled off (still drawn at 18% in the plot). */
  muted: ReadonlySet<number>;
  onFocus: (index: number | null) => void;
  onToggleMute: (index: number) => void;
  /** False renders plain rows (no hover, no mute): a list that only reads,
   *  such as the info-card ranking. Defaults to true. */
  interactive?: boolean;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Value-bearing legend (chart redesign).
 *
 * Not a row of dots: each entry pairs the series swatch with its number,
 * share, and a proportion meter (or a min/avg/max range in the compact
 * variant), so the breakdown reads without going back to the plot.
 * Hover focuses the series in the chart; click mutes it (kept at 18%
 * opacity in the plot rather than removed, so the shape of the whole
 * stays visible).
 */
export function ValueLegend({
  items,
  layout = "column",
  focused,
  muted,
  onFocus,
  onToggleMute,
  interactive = true,
}: ValueLegendProps) {
  void focused; // focus feedback lives in the plot; rows restyle on :hover
  return (
    <ul className={`sigil-legend${layout === "row" ? " sigil-legend--row" : ""}`}>
      {items.map((item, i) => {
        const isMuted = muted.has(i);
        const className =
          "sigil-leg" +
          (item.range ? " sigil-leg--lite" : "") +
          (isMuted ? " is-muted" : "") +
          (interactive ? "" : " is-static");
        const body = (
          <>
              {item.lead !== undefined ? (
                <span className="sigil-leg-lead">{item.lead}</span>
              ) : item.glyph !== undefined ? (
                <span className="sigil-leg-sw sigil-leg-sw--glyph" aria-hidden="true">
                  {item.glyph}
                </span>
              ) : (
                <span className="sigil-leg-sw" aria-hidden="true" />
              )}
              <span className="sigil-leg-name">{item.name}</span>
              <span className="sigil-leg-val">
                {item.value}
                {item.suffix !== undefined && (
                  <span className="sigil-leg-pct">{item.suffix}</span>
                )}
                {item.note !== undefined && (
                  <span className="sigil-leg-note" data-tone={item.note.tone ?? "muted"}>
                    <span aria-hidden="true">{item.note.glyph}</span>
                    <span className="sigil-sr-only">{item.note.label}</span>
                  </span>
                )}
              </span>
              {item.range ? (
                <span className="sigil-leg-range" aria-hidden>
                  <i className="sigil-leg-track" />
                  <i
                    className="sigil-leg-span"
                    style={{
                      left: `${clampPct(item.range.lo)}%`,
                      right: `${clampPct(100 - item.range.hi)}%`,
                    }}
                  />
                  <i
                    className="sigil-leg-avg"
                    style={{ left: `${clampPct(item.range.avg)}%` }}
                  />
                </span>
              ) : item.meter !== undefined ? (
                <span className="sigil-leg-meter" aria-hidden>
                  <i style={{ width: `${clampPct(item.meter)}%` }} />
                </span>
              ) : null}
          </>
        );
        return (
          <li key={`${item.name}-${i}`} className="sigil-leg-item">
            {interactive ? (
              <button
                type="button"
                className={className}
                style={{ "--c": item.color } as CSSProperties}
                aria-pressed={isMuted}
                onMouseEnter={() => onFocus(i)}
                onMouseLeave={() => onFocus(null)}
                onFocus={() => onFocus(i)}
                onBlur={() => onFocus(null)}
                onClick={() => onToggleMute(i)}
              >
                {body}
              </button>
            ) : (
              <div className={className} style={{ "--c": item.color } as CSSProperties}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
