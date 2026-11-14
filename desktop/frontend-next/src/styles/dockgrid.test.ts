import { describe, expect, it } from "vitest";

const CSS = import.meta.glob("./app.css", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("the docked pane's grid", () => {
  const css = Object.values(CSS)[0];
  const rule = css.match(/\.pane:has\(> \.pbody\[data-dock\]\) \{\s*display: grid;\s*grid-template:([^;]*);/);

  it("is found", () => {
    expect(rule).not.toBeNull();
  });

  it("runs the browser column down every row, from the top of the pane", () => {
    const rows = [...rule![1].split("/")[0].matchAll(/"([^"]+)"/g)].map((m) => m[1].trim().split(/\s+/));
    // The pill row rides above the composer: the guide lives with the compose
    // column, the browser keeps its column through all four rows.
    expect(rows.map((r) => r[0])).toEqual(["find", "body", "pilltop", "compose"]);
    expect(rows.map((r) => r[1])).toEqual(["side", "side", "side", "side"]);
  });
});
