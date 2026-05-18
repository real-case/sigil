import { SeriesSwatch } from "./SeriesSwatch.js";
import { useTheme } from "./theme.js";

export interface ChartLegendItem {
  name: string;
  color: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  selected: string | null;
  onToggle: (name: string) => void;
}

/**
 * Sibling-rendered chart legend.
 *
 * Lives in the normal DOM flow below the chart, so it cannot collide with
 * any axis labels positioned inside the chart's SVG. Unlike Recharts'
 * `<Legend>`, this component takes its space naturally — no absolute
 * positioning, no `wrapperStyle.bottom` battles with Recharts'
 * `offset.bottom` calculator.
 */
export function ChartLegend({ items, selected, onToggle }: ChartLegendProps) {
  const tokens = useTheme();
  return (
    <div
      role="list"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        paddingTop: 8,
        fontFamily: tokens.typography.family.sans,
        fontSize: tokens.typography.scale.label.fontSize,
        color: tokens.texts.secondary,
      }}
    >
      {items.map((item) => {
        const isDimmed = selected !== null && selected !== item.name;
        return (
          <button
            key={item.name}
            type="button"
            role="listitem"
            onClick={() => onToggle(item.name)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              font: "inherit",
              opacity: isDimmed ? 0.5 : 1,
              transition:
                "opacity var(--sigil-duration-fast) var(--sigil-easing-standard)",
            }}
          >
            <SeriesSwatch color={item.color} shape="circle" size={9} />
            <span>{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}
