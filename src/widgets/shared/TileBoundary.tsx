import { Component, type ReactNode } from "react";
import { EmptyState } from "./EmptyState.js";

// The repo's only class component — error boundaries have no hook equivalent.
// A tile payload can satisfy its guard and still throw inside the View (a shape
// the guard does not model, a Recharts edge case), and without a boundary that
// throw unmounts the entire dashboard rather than the one tile at fault.
interface TileBoundaryProps {
  /** Tile type, named in the error card so the failure is attributable. */
  label: string;
  children: ReactNode;
}

interface TileBoundaryState {
  /** Null while healthy; the thrown message once a child has failed. */
  message: string | null;
}

export class TileBoundary extends Component<TileBoundaryProps, TileBoundaryState> {
  override state: TileBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): { message: string } {
    // Message only — never a stack, which would leak host internals into a card.
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : "An unexpected error occurred.";
    return { message };
  }

  override render(): ReactNode {
    const { message } = this.state;
    if (message === null) return this.props.children;
    return (
      <EmptyState
        variant="error"
        title={`Could not render ${this.props.label}`}
        description={message}
      />
    );
  }
}
