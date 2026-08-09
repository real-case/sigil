import type { ReactNode } from "react";
import { EmptyState } from "../shared/EmptyState.js";
import { EmbeddedContext } from "../shared/embedded.js";
import { TileBoundary } from "../shared/TileBoundary.js";
import { lookupWidgetView } from "../shared/widget-views.js";

// One tile's worth of resolution: which widget, is the payload usable, and did
// rendering it blow up. Kept out of DashboardView so that component stays about
// grid layout, and so the failure ladder can be exercised without a grid.
const MAX_LABEL = 40;

/**
 * A tile type reaches the UI as untrusted text — the dashboard guard accepts any
 * non-empty string so one odd tile cannot reject the whole payload. React escapes
 * it, so the only remaining risk is layout: clamp it before interpolating.
 */
function labelFor(type: string): string {
  return type.length > MAX_LABEL ? `${type.slice(0, MAX_LABEL - 1)}…` : type;
}

export function Tile({
  type,
  payload,
}: {
  type: string;
  payload: unknown;
}): ReactNode {
  const label = labelFor(type);

  // Checked before the lookup: `dashboard` is absent from WIDGET_VIEWS on
  // purpose, so it would otherwise read as an unknown widget — wrong, because
  // the widget plainly exists and is simply not nestable.
  if (type === "dashboard") {
    return (
      <EmptyState
        variant="error"
        title="Nested dashboard"
        description="A dashboard cannot be a tile inside another dashboard."
      />
    );
  }

  const entry = lookupWidgetView(type);
  if (!entry) {
    return (
      <EmptyState
        variant="error"
        title="Unknown widget"
        description={`No widget of type "${label}".`}
      />
    );
  }

  // The guard runs in Tile's own render body, above TileBoundary, so a guard
  // that *throws* would escape to DashboardView and take the whole grid — the
  // failure this widget exists to prevent. A tile payload never passes through
  // the tool schema (render_dashboard types it as an opaque record), so an
  // adversarial one can reach e.g. isTreemapNode's unbounded recursion and blow
  // the stack. A guard that cannot answer is a guard that says no.
  let accepted = false;
  try {
    accepted = entry.isPayload(payload);
  } catch {
    accepted = false;
  }

  if (!accepted) {
    return (
      <EmptyState
        variant="error"
        title={`Invalid ${label} tile`}
        description={`The payload did not match the ${label} schema.`}
      />
    );
  }

  const { View } = entry;
  return (
    <EmbeddedContext.Provider value={true}>
      <TileBoundary label={label}>
        <View payload={payload as never} />
      </TileBoundary>
    </EmbeddedContext.Provider>
  );
}
