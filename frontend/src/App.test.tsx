// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import App from "./App";

// jsdom has no layout engine; give the real chart a measurable container.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <actual.ResponsiveContainer width={700} height={330}>
        {children}
      </actual.ResponsiveContainer>
    ),
  };
});
const tickers = ["TICK0001", "TICK0002", "TICK0003", "TICK0004"];
let offline = false;
beforeEach(() => {
  offline = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (offline) return new Response("", { status: 503 });
      if (url === "/api/instruments") return Response.json(tickers);
      if (url.endsWith("/stats"))
        return Response.json({
          totalReturnPercent: 10,
          dailyVolatilityPercent: 0,
          maxDrawdownPercent: 0,
        });
      return Response.json([
        { date: "2026-01-01", price: 100 },
        { date: "2026-01-02", price: 110 },
      ]);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Dashboard interactions", () => {
  it("loads prices and stats, searches, and handles no matches", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("10.00%");
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    await user.type(
      screen.getByRole("textbox", { name: "Search tickers" }),
      "tick0002",
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "missing");
    expect(screen.getByText("No matching instruments.")).toBeTruthy();
  });

  it("compares up to three, toggles normalization, and supports deselection", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("10.00%");
    await user.click(screen.getByRole("checkbox", { name: "TICK0002 Daily" }));
    await screen.findByRole("checkbox", {
      name: "Normalize comparison to 100",
    });
    await user.click(screen.getByRole("checkbox", { name: "TICK0003 Daily" }));
    await waitFor(() => expect(screen.getAllByText("10.00%")).toHaveLength(3));
    expect(
      (
        screen.getByRole("checkbox", {
          name: "TICK0004 Daily",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    await user.click(
      screen.getByRole("checkbox", { name: "Normalize comparison to 100" }),
    );
    expect(
      screen.getByText("Normalized performance · first closing price = 100"),
    ).toBeTruthy();
    for (const ticker of tickers.slice(0, 3))
      await user.click(
        screen.getByRole("checkbox", { name: `${ticker} Daily` }),
      );
    await screen.findByText(
      "Select an instrument from the list to get started.",
    );
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("recovers from an unavailable instrument API using Retry", async () => {
    offline = true;
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("alert");
    offline = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("10.00%");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a price error and retries without losing selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("10.00%");
    offline = true;
    await user.click(screen.getByRole("checkbox", { name: "TICK0002 Daily" }));
    await screen.findByRole("alert");
    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getAllByText("10.00%")).toHaveLength(2));
  });

  it("shows a loading state while instruments are pending", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText("Loading instruments…")).toBeTruthy();
  });
});
