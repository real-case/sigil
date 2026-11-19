// Drill-down: a click on a chart mark that asks the model a follow-up question.
//
// MCP Apps 1.7 lets a view post a message into the host's chat
// (`app.sendMessage`, gated by `hostCapabilities.message`) and quietly tell the
// model what the user is looking at (`app.updateModelContext`, gated by
// `hostCapabilities.updateModelContext`). This module is the one place that
// touches either call. Views never see the App: they ask `useFollowUp()` for a
// channel, and get `null` when the host cannot take a message — in which case a
// click keeps doing whatever it did before (mute, select, nothing).
//
// The decision logic is pure and exported separately from the hook, for the
// same reason as legend-state.ts: tests run in `node` with no DOM, so a hook is
// only reachable through a render, while a function is reachable directly.
//
// Messages the widget writes are in English on purpose. The model reads them,
// not the user, and they quote the chart's own labels verbatim, so a Russian
// chart still yields «Revenue by region» → "Выручка по регионам" in the text.

import { createContext, useContext } from "react";

/** What a view says about the mark the user picked. */
export interface FollowUpMark {
  /** The mark's own name as the chart shows it, e.g. "EMEA, Q3". */
  label: string;
  /** The mark's value as the chart prints it, e.g. "1.2M". Optional. */
  value?: string;
}

/** The slice of `App` this module needs — small, so tests can fake it. */
export interface FollowUpHost {
  getHostCapabilities():
    | { message?: unknown; updateModelContext?: unknown }
    | undefined;
  sendMessage(params: {
    role: "user";
    content: { type: "text"; text: string }[];
  }): Promise<{ isError?: boolean }>;
  updateModelContext(params: {
    content: { type: "text"; text: string }[];
  }): Promise<unknown>;
}

export interface FollowUpChannel {
  /**
   * Post `text` to the chat as the user's next message. Resolves true when
   * the host took it. While one message is in flight every further call
   * resolves false without sending: a double click, or a second pick from a
   * reopened menu, must not put two messages in the chat.
   */
  ask(text: string): Promise<boolean>;
  /** Tell the model which mark is selected, without starting a turn. */
  select(text: string): void;
}

/**
 * A channel over `host`, or null when the host has not declared `message`.
 * Capabilities are read per call rather than once: they arrive with the
 * connect handshake, which can land after the first render.
 */
export function createFollowUp(host: FollowUpHost | null | undefined): FollowUpChannel | null {
  if (!host?.getHostCapabilities()?.message) return null;
  let inFlight = false;
  return {
    async ask(text) {
      if (inFlight) return false;
      inFlight = true;
      try {
        const result = await host.sendMessage({
          role: "user",
          content: [{ type: "text", text }],
        });
        return !result?.isError;
      } catch {
        return false;
      } finally {
        inFlight = false;
      }
    },
    select(text) {
      if (!host.getHostCapabilities()?.updateModelContext) return;
      // Fire and forget: losing a context hint costs nothing the next message
      // will not restate, and a rejection must not surface as an unhandled one.
      host.updateModelContext({ content: [{ type: "text", text }] }).catch(() => {});
    },
  };
}

const FollowUpContext = createContext<FollowUpChannel | null>(null);

/** Provided by `mountWidget`; the sandbox can provide a fake one. */
export const FollowUpProvider = FollowUpContext.Provider;

/** The host's follow-up channel, or null when drill-down is unavailable. */
export function useFollowUp(): FollowUpChannel | null {
  return useContext(FollowUpContext);
}

// ----- menu items -------------------------------------------------------------

export interface FollowUpAction {
  /** Menu label. */
  label: string;
  /** The message this item posts for `mark` on the chart titled `chart`. */
  text(mark: FollowUpMark, chart: string): string;
}

const quoteMark = (mark: FollowUpMark) =>
  mark.value ? `"${mark.label}" (${mark.value})` : `"${mark.label}"`;

/**
 * The three questions a drill-down menu offers by default. "Break down" leaves
 * the dimension to the model: the widget does not know which other columns the
 * data has, and the model does.
 */
export const DEFAULT_FOLLOW_UPS: readonly FollowUpAction[] = [
  {
    label: "Break down…",
    text: (m, chart) =>
      `Break down ${quoteMark(m)} from the chart "${chart}" by another dimension.`,
  },
  {
    label: "Why is it like this?",
    text: (m, chart) => `Why does ${quoteMark(m)} in the chart "${chart}" look like this?`,
  },
  {
    label: "Show rows",
    text: (m, chart) => `Show the underlying rows for ${quoteMark(m)} in the chart "${chart}".`,
  },
];

/**
 * The menu for a payload: its own `followUps` when it brings any (the model
 * knows the data's other dimensions and can name them), else the defaults.
 * Each custom entry is both the label and the request, with the mark appended.
 */
export function followUpActions(custom?: readonly string[]): readonly FollowUpAction[] {
  const own = (custom ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
  if (own.length === 0) return DEFAULT_FOLLOW_UPS;
  return own.map((label) => ({
    label,
    text: (m, chart) => `${label.replace(/[.…:]+$/, "")}: ${quoteMark(m)} in the chart "${chart}".`,
  }));
}

/** The context hint sent when the menu opens on `mark`. */
export function selectionContext(mark: FollowUpMark, chart: string): string {
  return `The user selected ${quoteMark(mark)} in the chart "${chart}".`;
}
