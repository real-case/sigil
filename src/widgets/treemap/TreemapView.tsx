import { useMemo, useRef, useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TreemapPayload, TreemapNode } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { SigilTooltip } from "../shared/SigilTooltip.js";
import { EmptyState } from "../shared/EmptyState.js";
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
}

function toRechartsTree(
  nodes: TreemapNode[],
  tokens: ChartDesignTokens,
  inheritedIndex?: number,
): RechartsTreemapNode[] {
  return nodes.map((node, i) => {
    const paletteIndex = inheritedIndex ?? i;
    const fill =
      node.color ??
      tokens.series[paletteIndex % tokens.series.length]!;
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

interface NodeContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  fill?: string;
  depth?: number;
  selectedName: string | null;
  onToggle: (name: string) => void;
  tokens: ChartDesignTokens;
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
  selectedName,
  onToggle,
  tokens,
}: NodeContentProps) {
  if (width <= 0 || height <= 0) return null;
  const isLeaf = depth >= 1;
  const showName = isLeaf && width >= MIN_NAME_WIDTH && height >= MIN_NAME_HEIGHT;
  const showValue = isLeaf && width >= MIN_VALUE_WIDTH && height >= MIN_VALUE_HEIGHT;
  const opacity =
    selectedName === null || selectedName === name ? 1 : DIMMED_OPACITY;

  return (
    <g
      style={{
        cursor: isLeaf ? "pointer" : "default",
        transition:
          "opacity var(--sigil-duration-base) var(--sigil-easing-standard)",
      }}
      opacity={opacity}
      onClick={() => isLeaf && onToggle(name)}
    >
      <rect
        x={x + (isLeaf ? 1.5 : 0)}
        y={y + (isLeaf ? 1.5 : 0)}
        width={Math.max(0, width - (isLeaf ? 3 : 0))}
        height={Math.max(0, height - (isLeaf ? 3 : 0))}
        rx={isLeaf ? tokens.radius.sm : 0}
        ry={isLeaf ? tokens.radius.sm : 0}
        fill={isLeaf ? fill ?? tokens.series[0]! : "transparent"}
        stroke={isLeaf ? "transparent" : tokens.surfaces.bg}
        strokeWidth={depth === 0 ? 2 : 0}
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
    </g>
  );
}

export function TreemapView({ payload }: { payload: TreemapPayload }) {
  const tokens = useTheme();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { title, data } = payload;

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

  const tree = useMemo(() => toRechartsTree(data, tokens), [data, tokens]);
  const leaves = useMemo(() => flattenLeaves(data), [data]);

  const copyCsv = () => {
    const body: CsvCell[][] = leaves.map((l) => [l.path, l.value]);
    return copyText(toCsv(["path", "value"], body));
  };

  const copyPng = async () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) throw new Error("Chart SVG not found");
    await copySvgAsPng(svg as SVGSVGElement, "treemap", tokens.surfaces.bg);
  };

  const toggleSelection = (name: string) =>
    setSelectedName((prev) => (prev === name ? null : name));

  return (
    <div className="sigil-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
        <Toolbar>
          <ToolbarButton label="Copy CSV" onAction={copyCsv} />
          <ToolbarButton label="Copy PNG" onAction={copyPng} />
        </Toolbar>
      </div>
      <div className="sigil-canvas" ref={canvasRef}>
        <ResponsiveContainer width="100%" height={360}>
          <Treemap
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
                      name: typeof p.name === "string" ? p.name : undefined,
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
