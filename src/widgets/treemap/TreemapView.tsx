import { useCallback, useMemo, useRef, useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TreemapPayload, TreemapNode } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { useRovingFocus, type RovingFocus } from "../shared/roving-focus.js";
import { Toolbar, ToolbarButton, CsvIcon, PngIcon } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
import { chartLabel, countOf } from "../shared/chart-label.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const MIN_NAME_WIDTH = 40;
const MIN_NAME_HEIGHT = 20;
const MIN_VALUE_WIDTH = 60;
const MIN_VALUE_HEIGHT = 30;
const DIMMED_OPACITY = 0.3;

interface RechartsTreemapNode {
  name: string;
  value: number;
  fill?: string;
  children?: RechartsTreemapNode[];
  // Recharts 3's TreemapDataType requires an index signature.
  [key: string]: unknown;
}

function toRechartsTree(
  nodes: TreemapNode[],
  tokens: ChartDesignTokens,
  inheritedIndex?: number,
): RechartsTreemapNode[] {
  return nodes.map((node, i) => {
    const paletteIndex = inheritedIndex ?? i;
    const baseHue =
      node.color ?? tokens.series[paletteIndex % tokens.series.length]!;
    // Nested leaves share their group's hue; shade siblings along a tonal
    // family so adjacent tiles of the same group stay distinguishable.
    const isNestedLeaf =
      inheritedIndex !== undefined && !node.children?.length;
    const fill =
      isNestedLeaf && !node.color && nodes.length > 1
        ? `color-mix(in oklab, ${baseHue}, white ${Math.round((i / (nodes.length - 1)) * 32)}%)`
        : baseHue;
    const out: RechartsTreemapNode = {
      name: node.label,
      value: node.value,
      fill,
    };
    if (node.children?.length) {
      out.children = toRechartsTree(node.children, tokens, paletteIndex);
    }
    return out;
  });
}

function flattenLeaves(
  nodes: TreemapNode[],
  path: string[] = [],
): Array<{ path: string; value: number }> {
  const out: Array<{ path: string; value: number }> = [];
  for (const node of nodes) {
    const here = [...path, node.label];
    if (node.children?.length) {
      out.push(...flattenLeaves(node.children, here));
    } else {
      out.push({ path: here.join(" / "), value: node.value });
    }
  }
  return out;
}

/**
 * Internal nodes below the invisible root — the group blocks a viewer sees but
 * cannot select. They are drawn, so a name that counts only leaves understates
 * what is on screen; they are not in the keyboard sequence, so they cannot be
 * folded into the leaf count either.
 */
export function countGroups(nodes: TreemapNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.children?.length) n += 1 + countGroups(node.children);
  }
  return n;
}

/**
 * Detail half of the treemap's accessible name. Exported because the Recharts
 * `<svg>` never reaches the server renderer — `renderToString` of this view
 * emits no `aria-label` at all — so the assembled string is only testable here,
 * not through the rendered output.
 *
 * "in N groups" rather than a comma clause, matching the line chart's
 * "N series over M points".
 */
export function treemapDetail(tiles: number, groups: number): string {
  return groups > 0
    ? `${countOf(tiles, "tile")} in ${countOf(groups, "group")}`
    : countOf(tiles, "tile");
}

interface NodeContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  fill?: string;
  depth?: number;
  children?: unknown[];
  selectedName: string | null;
  onToggle: (name: string) => void;
  tokens: ChartDesignTokens;
  /** Leaf name → position in the keyboard sequence. */
  leafOrder: Map<string, number>;
  /** Leaf name → full breadcrumb, so the tile announces what the tooltip says. */
  leafPaths: Map<string, string>;
  roving: RovingFocus<SVGGElement>;
}

function NodeContent({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = "",
  value,
  fill,
  depth = 0,
  children,
  selectedName,
  onToggle,
  tokens,
  leafOrder,
  leafPaths,
  roving,
}: NodeContentProps) {
  if (width <= 0 || height <= 0) return null;
  // A leaf is any node without children — robust to irregular nesting depth
  // (some branches go deeper than others). Internal nodes below the invisible
  // root (depth 0) are groups.
  const isLeaf = !(children && children.length > 0);
  const isGroup = !isLeaf && depth >= 1;
  const showName = isLeaf && width >= MIN_NAME_WIDTH && height >= MIN_NAME_HEIGHT;
  const showValue = isLeaf && width >= MIN_VALUE_WIDTH && height >= MIN_VALUE_HEIGHT;
  const opacity =
    selectedName === null || selectedName === name ? 1 : DIMMED_OPACITY;

  const body = (
    <>
      <rect
        x={x + (isLeaf ? 1.5 : 0)}
        y={y + (isLeaf ? 1.5 : 0)}
        width={Math.max(0, width - (isLeaf ? 3 : 0))}
        height={Math.max(0, height - (isLeaf ? 3 : 0))}
        rx={isLeaf ? tokens.radius.sm : 0}
        ry={isLeaf ? tokens.radius.sm : 0}
        fill={isLeaf ? fill ?? tokens.series[0]! : "transparent"}
        // Groups paint a background "moat" on their border so adjacent groups
        // read as separate blocks, wider than the gaps between leaves. Top-level
        // groups get a wider moat than sub-groups, conveying the hierarchy.
        stroke={isGroup ? tokens.surfaces.bg : "transparent"}
        strokeWidth={isGroup ? (depth === 1 ? 6 : 3) : 0}
      />
      {showName && (
        <text
          x={x + 8}
          y={y + 16}
          fill="rgba(255,255,255,0.95)"
          style={{
            fontFamily: tokens.typography.family.sans,
            fontSize: tokens.typography.scale.label.fontSize,
            fontWeight: 500,
            textShadow: "0 1px 1px rgba(0,0,0,0.18)",
            paintOrder: "stroke",
          }}
        >
          {name}
        </text>
      )}
      {showValue && value !== undefined && (
        <text
          x={x + 8}
          y={y + 32}
          fill="rgba(255,255,255,0.8)"
          style={{
            fontFamily: tokens.typography.family.mono,
            fontSize: tokens.typography.scale.tick.fontSize,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 1px 1px rgba(0,0,0,0.18)",
          }}
        >
          {value}
        </text>
      )}
    </>
  );

  const transition =
    "opacity var(--sigil-duration-base) var(--sigil-easing-standard)";

  // Groups are scaffolding — they have no selection of their own, so they stay
  // out of the keyboard sequence and out of the accessibility tree.
  if (!isLeaf) {
    return (
      <g style={{ transition }} opacity={opacity}>
        {body}
      </g>
    );
  }

  const index = leafOrder.get(name);
  const item = roving.itemProps(index ?? 0);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <button> cannot exist inside an <svg>; role="button" is the only way to say "toggle" on a tile.
    <g
      className="sigil-mark"
      role="button"
      aria-pressed={selectedName === name}
      aria-label={`${leafPaths.get(name) ?? name}${value === undefined ? "" : `: ${value}`}`}
      ref={item.ref}
      tabIndex={index === undefined ? -1 : item.tabIndex}
      onFocus={item.onFocus}
      onKeyDown={item.onKeyDown}
      style={{ cursor: "pointer", transition }}
      opacity={opacity}
      onClick={() => onToggle(name)}
    >
      {body}
    </g>
  );
}

export function TreemapView({ payload }: { payload: TreemapPayload }) {
  const tokens = useTheme();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data } = payload;

  // Every hook stays above the empty-payload return: a payload that arrives
  // empty and is then replaced by a full one would otherwise change the hook
  // count between renders.
  const tree = useMemo(() => toRechartsTree(data, tokens), [data, tokens]);
  const leaves = useMemo(() => flattenLeaves(data), [data]);
  // Parent groups can't carry an on-canvas header (Recharts lays children over
  // the whole parent rect), so surface the full breadcrumb in the tooltip.
  const pathByLeaf = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leaves) {
      const leaf = l.path.split(" / ").pop()!;
      m.set(leaf, l.path);
    }
    return m;
  }, [leaves]);

  // Tiles are one composite widget: a single tab stop, then the arrow keys step
  // through the leaves in the order the payload lists them.
  const leafOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leaves) {
      const leaf = l.path.split(" / ").pop()!;
      if (!m.has(leaf)) m.set(leaf, m.size);
    }
    return m;
  }, [leaves]);
  const leafNames = useMemo(() => Array.from(leafOrder.keys()), [leafOrder]);
  const groupCount = useMemo(() => countGroups(data), [data]);

  const toggleSelection = useCallback(
    (name: string) => setSelectedName((prev) => (prev === name ? null : name)),
    [],
  );

  const roving = useRovingFocus<SVGGElement>({
    count: leafNames.length,
    onActivate: (index) => {
      const name = leafNames[index];
      if (name) toggleSelection(name);
    },
  });

  if (data.length === 0) {
    return (
      <div className="sigil-root">
        <div className="sigil-header">
          <h2 className="sigil-title">{title}</h2>
        </div>
        <EmptyState title="No data to display" description="The payload was empty." />
      </div>
    );
  }

  const copyCsv = () => {
    const body: CsvCell[][] = leaves.map((l) => [l.path, l.value]);
    return copyText(toCsv(["path", "value"], body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "treemap", tokens.surfaces.bg);
  };

  return (
    <div className="sigil-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton icon={<CsvIcon />} label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton icon={<PngIcon />} label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={360}>
          <Treemap
            aria-label={chartLabel(
              title,
              "treemap",
              treemapDetail(leafNames.length, groupCount),
            )}
            data={tree}
            dataKey="value"
            nameKey="name"
            stroke={tokens.surfaces.bg}
            isAnimationActive={false}
            content={
              <NodeContent
                selectedName={selectedName}
                onToggle={toggleSelection}
                tokens={tokens}
                leafOrder={leafOrder}
                leafPaths={pathByLeaf}
                roving={roving}
              />
            }
          >
            <Tooltip
              content={(props) => (
                <SigilTooltip
                  active={props.active}
                  hideLabel
                  payload={
                    props.payload?.map((p) => ({
                      color: typeof p.color === "string" ? p.color : undefined,
                      name:
                        typeof p.name === "string"
                          ? pathByLeaf.get(p.name) ?? p.name
                          : undefined,
                      dataKey: p.dataKey as string | number | undefined,
                      value: p.value as number | string | undefined,
                    }))
                  }
                />
              )}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
