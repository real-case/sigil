import { useMemo, useRef, useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TreemapPayload, TreemapNode } from "../../shared/payloads.js";
import { useTheme, type ChartDesignTokens } from "../shared/theme.js";
import { Toolbar, ToolbarButton } from "../shared/Toolbar.js";
import { toCsv, copyText, copySvgAsPng, type CsvCell } from "../shared/export-utils.js";

const MIN_LABEL_WIDTH = 64;
const MIN_LABEL_HEIGHT = 24;
const DIMMED_OPACITY = 0.25;

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
      tokens.seriesColors[paletteIndex % tokens.seriesColors.length]!;
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

function flattenLeaves(nodes: TreemapNode[], path: string[] = []): Array<{ path: string; value: number }> {
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
  fill,
  depth = 0,
  selectedName,
  onToggle,
  tokens,
}: NodeContentProps) {
  if (width <= 0 || height <= 0) return null;
  const isLeaf = depth >= 1;
  const showLabel = isLeaf && width >= MIN_LABEL_WIDTH && height >= MIN_LABEL_HEIGHT;
  const opacity =
    selectedName === null || selectedName === name ? 1 : DIMMED_OPACITY;
  return (
    <g
      style={{ cursor: isLeaf ? "pointer" : "default", transition: "opacity 150ms ease" }}
      opacity={opacity}
      onClick={() => isLeaf && onToggle(name)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isLeaf ? (fill ?? tokens.seriesColors[0]!) : "transparent"}
        stroke={tokens.background}
        strokeWidth={depth === 0 ? 2 : 1}
      />
      {showLabel && (
        <text
          x={x + 8}
          y={y + 16}
          fill={tokens.tooltipText}
          fontSize={tokens.fontSize.label}
          fontFamily={tokens.fontFamily}
        >
          {name}
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
    return <EmptyState title={title} />;
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
    await copySvgAsPng(svg as SVGSVGElement, "treemap", tokens.background);
  };

  const toggleSelection = (name: string) =>
    setSelectedName((prev) => (prev === name ? null : name));

  const tooltipStyle = {
    background: tokens.tooltipBackground,
    border: `1px solid ${tokens.tooltipBorder}`,
    borderRadius: tokens.borderRadius,
    color: tokens.tooltipText,
    fontSize: tokens.fontSize.tooltip,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  };
  const tooltipLabelStyle = { color: tokens.tooltipText, fontWeight: 600 };
  const tooltipItemStyle = { color: tokens.tooltipText };

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
            stroke={tokens.background}
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
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="sigil-root sigil-empty">
      <h2 className="sigil-title">{title}</h2>
      <p>No data to display.</p>
    </div>
  );
}
