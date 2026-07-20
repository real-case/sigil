interface SeriesSwatchProps {
  color: string;
  shape?: "circle" | "square";
  size?: number;
}

export function SeriesSwatch({
  color,
  shape = "circle",
  size = 10,
}: SeriesSwatchProps) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color,
        borderRadius: shape === "circle" ? "50%" : 3,
        flexShrink: 0,
      }}
    />
  );
}
