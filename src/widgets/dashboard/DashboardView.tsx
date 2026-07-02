import type { DashboardPayload } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";
import { Card } from "../shared/Card.js";
import { EmptyState } from "../shared/EmptyState.js";
import { EmbeddedContext } from "../shared/embedded.js";
import { WIDGET_VIEWS } from "../shared/widget-views.js";

export function DashboardView({ payload }: { payload: DashboardPayload }) {
  const tokens = useTheme();
  const { title, tiles } = payload;
  const columns = Math.max(1, Math.min(4, payload.columns ?? 2));

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

  return (
    <div className="sigil-root">
      <div className="sigil-header">
        <h2 className="sigil-title">{title}</h2>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: tokens.spacing.md,
          alignItems: "start",
        }}
      >
        {tiles.map((tile, i) => {
          const View = WIDGET_VIEWS[tile.type];
          const span = Math.max(1, Math.min(columns, tile.colSpan ?? 1));
          return (
            <Card
              key={i}
              padding="none"
              elevation="low"
              style={{ gridColumn: `span ${span}`, minWidth: 0, overflow: "hidden" }}
            >
              {View ? (
                <EmbeddedContext.Provider value={true}>
                  <View payload={tile.payload as never} />
                </EmbeddedContext.Provider>
              ) : (
                <EmptyState
                  variant="error"
                  title="Unknown widget"
                  description={`No widget of type "${tile.type}".`}
                />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
