import type { EmptyStatePayload } from "../../shared/payloads.js";
import { useTheme } from "../shared/theme.js";

export function EmptyStateView({ payload }: { payload: EmptyStatePayload }) {
  const tokens = useTheme();
  return (
    <div
      className="sigil-root"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: 0, color: tokens.textPrimary, fontSize: tokens.fontSize.title }}>
        {payload.title}
      </h2>
      <p style={{ margin: 0, color: tokens.textSecondary, fontSize: tokens.fontSize.label }}>
        {payload.message}
      </p>
    </div>
  );
}
