import { useState } from "react";

type Status = "idle" | "ok" | "err";

const FEEDBACK_MS = 1500;

export function ToolbarButton({
  label,
  onAction,
  successLabel = "Copied ✓",
  errorLabel = "Failed",
}: {
  label: string;
  onAction: () => Promise<void> | void;
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
      className={`sigil-toolbar-btn${status === "err" ? " is-error" : ""}`}
      onClick={run}
      disabled={status !== "idle"}
    >
      {shown}
    </button>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="sigil-toolbar">{children}</div>;
}
