import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { DashboardEntry, DashboardPayload, DashboardTile } from "../../shared/payloads.js";
import { isDashboardSection } from "../../shared/schemas.js";
import { useTheme } from "../shared/theme.js";
import { Card } from "../shared/Card.js";
import { EmptyState } from "../shared/EmptyState.js";
import { Tile } from "./Tile.js";
import { clampSpan, effectiveColumns, provenanceLine } from "./grid-layout.js";

function useContainerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Muted footnote: a note on its own line, then "Source · As of". */
function Footnote({ note, source, asOf, className }: { note?: string; source?: string; asOf?: string; className: string }) {
  const line = provenanceLine({ source, asOf });
  if (!note && !line) return null;
  return (
    <div className={className}>
      {note && <p className="sigil-dash-note">{note}</p>}
      {line && <p className="sigil-dash-source">{line}</p>}
    </div>
  );
}

export function DashboardView({ payload }: { payload: DashboardPayload }) {
  const tokens = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(rootRef);
  const { title, tiles } = payload;
  const gap = tokens.spacing.md;
  const columns = effectiveColumns(payload.columns, width, gap);

  if (!tiles || tiles.length === 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No tiles to display" description="The dashboard was empty." />
      </div>
    );
  }

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap,
    alignItems: "start",
  };

  const renderTile = (tile: DashboardTile, key: string) => (
    <Card
      key={key}
      padding="none"
      elevation="low"
      className="sigil-dash-tile"
      style={{ gridColumn: `span ${clampSpan(tile.colSpan, columns)}`, minWidth: 0, overflow: "hidden" }}
    >
      <Tile type={tile.type} payload={tile.payload} />
      <Footnote note={tile.note} source={tile.source} asOf={tile.asOf} className="sigil-dash-tile-foot" />
    </Card>
  );

  // Consecutive plain tiles share one grid; a section opens its own, under its
  // heading. So a dashboard with no sections renders exactly as it used to.
  const blocks: ReactNode[] = [];
  let loose: DashboardTile[] = [];
  const flushLoose = (at: number) => {
    if (loose.length === 0) return;
    const run = loose;
    loose = [];
    blocks.push(
      <div key={`grid-${at}`} className="sigil-dash-grid" style={gridStyle}>
        {run.map((t, i) => renderTile(t, `${at}-${i}`))}
      </div>,
    );
  };
  tiles.forEach((entry: DashboardEntry, i) => {
    if (!isDashboardSection(entry)) {
      loose.push(entry);
      return;
    }
    flushLoose(i);
    const headingId = `sigil-dash-section-${i}`;
    blocks.push(
      <section key={`section-${i}`} className="sigil-dash-section" aria-labelledby={headingId}>
        <div className="sigil-dash-section-head">
          <h3 id={headingId} className="sigil-dash-section-title">
            {entry.section}
          </h3>
          {entry.description && <p className="sigil-dash-section-desc">{entry.description}</p>}
        </div>
        <div className="sigil-dash-grid" style={gridStyle}>
          {entry.tiles.map((t, j) => renderTile(t, `${i}-${j}`))}
        </div>
      </section>,
    );
  });
  flushLoose(tiles.length);

  return (
    <div className="sigil-root sigil-dash" ref={rootRef} data-columns={columns}>
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
      </div>
      <div className="sigil-dash-body" style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        {blocks}
      </div>
      <Footnote note={payload.note} source={payload.source} asOf={payload.asOf} className="sigil-dash-foot" />
    </div>
  );
}
