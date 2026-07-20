import { useState, type ReactNode } from "react";

type Status = "idle" | "ok" | "err";

const FEEDBACK_MS = 1500;

/** 12px chart-bars glyph for "Copy CSV". */
export function CsvIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M9 17v-6M12 17v-3M15 17v-8" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

/** 12px picture glyph for "Copy PNG". */
export function PngIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function ToolbarButton({
  label,
  onAction,
  icon,
  successLabel = "Copied ✓",
  errorLabel = "Failed",
}: {
  label: string;
  onAction: () => Promise<void> | void;
  icon?: ReactNode;
  successLabel?: string;
  errorLabel?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  const run = async () => {
    try {
      await onAction();
      setStatus("ok");
    } catch {
      setStatus("err");
    } finally {
      setTimeout(() => setStatus("idle"), FEEDBACK_MS);
    }
  };

  const shown =
    status === "idle" ? label : status === "ok" ? successLabel : errorLabel;

  return (
    <button
      type="button"
      className={`sigil-toolbar-btn${status === "ok" ? " is-ok" : ""}${status === "err" ? " is-error" : ""}`}
      onClick={run}
      disabled={status !== "idle"}
    >
      {icon}
      <span>{shown}</span>
    </button>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="sigil-toolbar">{children}</div>;
}
