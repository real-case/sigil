import { useEffect, useState } from "react";

/**
 * Whether a CSS media query currently matches, kept live. Returns false where
 * there is no `matchMedia` (server render, tests), which is also the right
 * answer for every query Sigil asks: forced colours and raised contrast are
 * opt-in user settings.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && (window.matchMedia?.(query).matches ?? false),
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * Dash patterns that tell line series apart when colour cannot — Windows
 * High Contrast (forced colours) paints every series in one system colour.
 * Index 0 stays solid, so a single-series chart looks unchanged.
 */
export const SERIES_DASHES = ["", "8 4", "2 4", "12 4 2 4", "4 4", "12 4 2 4 2 4", "1 3", "16 6"];

export function seriesDash(index: number): string | undefined {
  const d = SERIES_DASHES[index % SERIES_DASHES.length];
  return d === "" ? undefined : d;
}
