import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  type SankeyNodeProps,
  type SankeyLinkProps,
} from "recharts";
import type { SankeyPayload } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { ChartHeader } from "../shared/ChartHeader.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip, type TooltipRow } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { fmtCompact, fmtNumber } from "../shared/chart-text.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const CANVAS_HEIGHT = 360;
const NODE_WIDTH = 12;
const NODE_PADDING = 20;
const MARGIN_X = 12;
const LABEL_GAP = 8;
const MAX_LABEL_CHARS = 24;
const MIN_LABEL_CHARS = 8;
// Conservative average advance of IBM Plex Sans 500 at the label size — used to
// turn the pixel room between columns into a character budget. Overestimating
// is the safe direction: it truncates a little early rather than colliding.
const LABEL_CHAR_PX = 7.4;
// Every node hangs its label to the right, so the final column needs room
// outside the plot. Reserving it as chart margin keeps each column gap
// single-use: no two labels ever reach into the same space.
const LABEL_BAND_MAX = MAX_LABEL_CHARS * LABEL_CHAR_PX;
const LABEL_BAND_RATIO = 0.28;
const MIN_VALUE_HEIGHT = 26;
const LINK_OPACITY_BASE = 0.3;
const LINK_OPACITY_ACTIVE = 0.55;
const LINK_OPACITY_DIMMED = 0.12;
const NODE_OPACITY_DIMMED = 0.35;

interface FlowGraph {
  /** Node names in column/palette order. */
  names: string[];
  /** Resolved fill per node index (payload override or palette). */
  colors: string[];
  /** Recharts-shaped data: nodes + index-based links. */
  data: {
    nodes: Array<{ name: string }>;
    links: Array<{ source: number; target: number; value: number }>;
  };
  /** Sum of flow leaving root nodes (nodes with no incoming links). */
  totalInflow: number;
  /**
   * Longest-path depth of the deepest node — i.e. the number of column gaps.
   * Mirrors how Recharts lays columns out (`x = depth * (width - nodeWidth) /
   * maxDepth`), so the label budget below can be derived from it.
   */
  maxDepth: number;
}

type GraphResult = { ok: true; graph: FlowGraph } | { ok: false; reason: string };

/**
 * Resolve name-based payload links into the index-based structure Recharts
 * wants, deriving any nodes the explicit list doesn't mention. Rejects the
 * two shapes the sankey layout cannot draw: self-loops and cycles.
 */
function buildGraph(payload: SankeyPayload, tokens: ChartDesignTokens): GraphResult {
  const names: string[] = [];
  const colorByName = new Map<string, string | undefined>();
  const indexByName = new Map<string, number>();

  const addNode = (name: string, color?: string) => {
    if (indexByName.has(name)) return;
    indexByName.set(name, names.length);
    names.push(name);
    colorByName.set(name, color);
  };

  for (const node of payload.nodes ?? []) {
    if (indexByName.has(node.name)) {
      return { ok: false, reason: `Duplicate node "${node.name}".` };
    }
    addNode(node.name, node.color);
  }
  for (const link of payload.links) {
    addNode(link.source);
    addNode(link.target);
  }

  const links = payload.links.map((l) => ({
    source: indexByName.get(l.source)!,
    target: indexByName.get(l.target)!,
    value: l.value,
  }));

  for (const l of payload.links) {
    if (l.source === l.target) {
      return { ok: false, reason: `Flow from "${l.source}" to itself.` };
    }
  }

  // Kahn's algorithm: the layout walks source→target and never terminates on
  // a cycle, so refuse cyclic graphs with a readable error instead. The same
  // pass yields each node's longest-path depth — valid because Kahn's pops in
  // topological order, so a node's depth is final when it is dequeued.
  const indegree = new Array<number>(names.length).fill(0);
  for (const l of links) indegree[l.target] = indegree[l.target]! + 1;
  const depth = new Array<number>(names.length).fill(0);
  const queue = indegree.flatMap((d, i) => (d === 0 ? [i] : []));
  let visited = 0;
  while (queue.length > 0) {
    const n = queue.shift()!;
    visited += 1;
    for (const l of links) {
      if (l.source !== n) continue;
      if (depth[n]! + 1 > depth[l.target]!) depth[l.target] = depth[n]! + 1;
      indegree[l.target] = indegree[l.target]! - 1;
      if (indegree[l.target] === 0) queue.push(l.target);
    }
  }
  if (visited < names.length) {
    return { ok: false, reason: "Flows must be acyclic — a chain of links loops back on itself." };
  }

  const colors = names.map(
    (name, i) => colorByName.get(name) ?? tokens.series[i % tokens.series.length]!,
  );

  const hasIncoming = new Set(links.map((l) => l.target));
  const totalInflow = links
    .filter((l) => !hasIncoming.has(l.source))
    .reduce((sum, l) => sum + l.value, 0);

  return {
    ok: true,
    graph: {
      names,
      colors,
      data: { nodes: names.map((name) => ({ name })), links },
      totalInflow,
      maxDepth: Math.max(0, ...depth),
    },
  };
}

type Hover = { kind: "node" | "link"; index: number } | null;

/**
 * Fit a node name into `cap` characters of room. A name that already fits is
 * left alone whatever the room is; one that doesn't is truncated only while the
 * stub stays readable, and otherwise dropped (null) the way treemap drops
 * sub-threshold tile labels — the tooltip still carries the full name.
 */
function fitLabel(name: string, cap: number): string | null {
  if (name.length <= cap) return name;
  if (cap < MIN_LABEL_CHARS) return null;
  return `${name.slice(0, cap - 1)}…`;
}

/** Tooltip rows carry either a link payload (source/target resolved to layout
 * nodes or still numeric indices — Recharts is inconsistent) or a node payload. */
function readTooltipEndpoint(value: unknown, names: string[]): string {
  if (typeof value === "number") return names[value] ?? "?";
  if (value && typeof value === "object" && "name" in value) {
    const n = (value as { name?: unknown }).name;
    if (typeof n === "string") return n;
  }
  return "?";
}

export function SankeyView({ payload }: { payload: SankeyPayload }) {
  const tokens = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const { title, links, valueLabel } = payload;

  const result = useMemo(() => buildGraph(payload, tokens), [payload, tokens]);
  const graph = result.ok ? result.graph : null;

  // Adjacency, precomputed once so hover emphasis is O(1) per element: which
  // links touch each node. Hooks stay above the early returns — a widget can
  // receive a new (possibly invalid) payload on a later tool result.
  const linksByNode = useMemo(() => {
    if (!graph) return [];
    const m = graph.names.map(() => new Set<number>());
    graph.data.links.forEach((l, i) => {
      m[l.source]!.add(i);
      m[l.target]!.add(i);
    });
    return m;
  }, [graph]);

  // Labels are sized against the rendered width — a half-width dashboard tile
  // has far less room than a standalone widget — so the layout below needs the
  // measured canvas. Re-attached on `graph` so the observer also picks up a
  // switch from the error state back to a drawable chart.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === "number") setCanvasWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [graph]);

  const layout = useMemo(() => {
    const band =
      canvasWidth === 0
        ? LABEL_BAND_MAX
        : Math.min(LABEL_BAND_MAX, canvasWidth * LABEL_BAND_RATIO);
    const caps = { column: MAX_LABEL_CHARS, band: MAX_LABEL_CHARS };
    if (!graph || canvasWidth === 0 || graph.maxDepth < 1) return { band, caps };
    const toChars = (px: number) =>
      Math.min(MAX_LABEL_CHARS, Math.floor(px / LABEL_CHAR_PX));
    // Recharts lays the columns out across the plot left of the reserved band
    // (`contentWidth = width - margin.left - margin.right`), spacing them at
    // (plotWidth - nodeWidth) / maxDepth. A label takes that pitch minus the
    // node it hangs off and a gap at each end; the final column gets the band.
    const plotWidth = canvasWidth - MARGIN_X * 2 - band;
    const pitch = (plotWidth - NODE_WIDTH) / graph.maxDepth;
    return {
      band,
      caps: {
        column: toChars(pitch - NODE_WIDTH - LABEL_GAP * 2),
        band: toChars(band - LABEL_GAP * 2),
      },
    };
  }, [graph, canvasWidth]);

  if (links.length === 0) {
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }
  if (!graph) {
    const reason = result.ok ? "" : result.reason;
    return (
      <div className="sigil-root">
        <ChartHeader title={title} />
        <EmptyState variant="error" title="Invalid flow data" description={reason} />
      </div>
    );
  }
  const { names, colors, data, totalInflow, maxDepth } = graph;

  const nodeOpacity = (index: number): number => {
    if (!hover) return 1;
    if (hover.kind === "node") {
      if (index === hover.index) return 1;
      return linksByNode[index]!.size > 0 &&
        [...linksByNode[hover.index]!].some((l) => linksByNode[index]!.has(l))
        ? 1
        : NODE_OPACITY_DIMMED;
    }
    const l = data.links[hover.index]!;
    return index === l.source || index === l.target ? 1 : NODE_OPACITY_DIMMED;
  };

  const linkOpacity = (index: number): number => {
    if (!hover) return LINK_OPACITY_BASE;
    const active =
      hover.kind === "link"
        ? index === hover.index
        : linksByNode[hover.index]!.has(index);
    return active ? LINK_OPACITY_ACTIVE : LINK_OPACITY_DIMMED;
  };

  const formatFlow = (v: number | string): string => {
    const num = typeof v === "number" ? fmtNumber(v) : v;
    return valueLabel ? `${num} ${valueLabel}` : num;
  };

  const renderNode = (props: SankeyNodeProps) => {
    const { x, y, width, height, index, payload: node } = props;
    const labelX = x + width + LABEL_GAP;
    const midY = y + height / 2;
    // Only sinks land in the final column — Recharts' `align: "justify"` pushes
    // every node without outgoing links to maxDepth — so those read from the
    // reserved band and the rest from their own column gap.
    const cap = node.depth === maxDepth ? layout.caps.band : layout.caps.column;
    const label = fitLabel(node.name, cap);
    const showValue = label !== null && height >= MIN_VALUE_HEIGHT;
    return (
      <g
        style={{
          transition: "opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
        }}
        opacity={nodeOpacity(index)}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={2}
          ry={2}
          fill={colors[index]}
        />
        {label !== null && (
          <text
            x={labelX}
            y={showValue ? midY - 7 : midY}
            dominantBaseline="central"
            fill={tokens.texts.secondary}
            style={{
              fontFamily: tokens.typography.family.sans,
              fontSize: tokens.typography.scale.label.fontSize,
              fontWeight: 500,
            }}
          >
            {label}
          </text>
        )}
        {showValue && (
          <text
            x={labelX}
            y={midY + 8}
            dominantBaseline="central"
            fill={tokens.texts.muted}
            style={{
              fontFamily: tokens.typography.family.mono,
              fontSize: tokens.typography.scale.tick.fontSize,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtCompact(node.value as number)}
          </text>
        )}
      </g>
    );
  };

  const renderLink = (props: SankeyLinkProps) => {
    const {
      sourceX,
      sourceY,
      sourceControlX,
      targetX,
      targetY,
      targetControlX,
      linkWidth,
      index,
      payload: link,
    } = props;
    const sourceIndex = names.indexOf(link.source.name);
    return (
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={colors[sourceIndex] ?? tokens.series[0]!}
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={linkOpacity(index)}
        style={{
          transition:
            "stroke-opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
        }}
      />
    );
  };

  const copyCsv = () => {
    const body: CsvCell[][] = links.map((l) => [l.source, l.target, l.value]);
    return copyText(toCsv(["source", "target", "value"], body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "sankey", tokens.surfaces.bg);
  };

  return (
    <div className="sigil-root">
      <ChartHeader
        title={title}
        kpi={{ value: fmtCompact(totalInflow), caption: valueLabel ?? "total flow" }}
      >
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </ChartHeader>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={CANVAS_HEIGHT}>
          <Sankey
            data={data}
            nodeWidth={NODE_WIDTH}
            nodePadding={NODE_PADDING}
            margin={{
              top: 12,
              right: MARGIN_X + layout.band,
              bottom: 12,
              left: MARGIN_X,
            }}
            node={renderNode}
            link={renderLink}
            onMouseEnter={(item, type) =>
              setHover({ kind: type, index: item.index })
            }
            onMouseLeave={() => setHover(null)}
          >
            <Tooltip
              content={(props) => {
                const row = props.payload?.[0];
                if (!row) return null;
                // The sankey tooltip searcher hands back a {payload, name,
                // value} wrapper — the actual node/link sits one level down.
                const wrapper = row.payload as Record<string, unknown> | undefined;
                const p =
                  wrapper && typeof wrapper["payload"] === "object"
                    ? (wrapper["payload"] as Record<string, unknown>)
                    : wrapper;
                let name = typeof row.name === "string" ? row.name : "";
                let color: string | undefined;
                if (p && "source" in p && "target" in p) {
                  const source = readTooltipEndpoint(p["source"], names);
                  const target = readTooltipEndpoint(p["target"], names);
                  name = `${source} → ${target}`;
                  color = colors[names.indexOf(source)];
                } else if (p && typeof p["name"] === "string") {
                  name = p["name"];
                  color = colors[names.indexOf(name)];
                }
                const rows: TooltipRow[] = [
                  { color, name, dataKey: "value", value: row.value as number | string },
                ];
                return (
                  <SigilTooltip
                    active={props.active}
                    hideLabel
                    payload={rows}
                    formatValue={formatFlow}
                  />
                );
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
