import { createContext, useContext } from "react";

/**
 * True when a widget View is rendered inside a dashboard tile (which is itself a
 * surface Card). Widgets that paint their own surfaces — e.g. stat-panel's KPI
 * cards — read this to recede those surfaces to a sunken well, so a surface card
 * on a surface tile doesn't read as a muddy surface-on-surface nest. Standalone
 * (the default `false`), those surfaces stay raised against the page background.
 */
export const EmbeddedContext = createContext(false);

export function useEmbedded(): boolean {
  return useContext(EmbeddedContext);
}
