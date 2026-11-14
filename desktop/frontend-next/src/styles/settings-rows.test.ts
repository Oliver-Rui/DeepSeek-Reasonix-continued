import { describe, expect, it } from "vitest";
import settings from "../design/settings.css?raw";
import app from "./app.css?raw";

const rules = (css: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bodies: string[] = [];
  const re = new RegExp("(?:^|\\n)\\s*" + escaped + " \\{", "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const open = css.indexOf("{", m.index);
    bodies.push(css.slice(open, css.indexOf("}", open)));
  }
  return bodies.join("\n");
};

const rule = (css: string, selector: string) => {
  const at = css.search(new RegExp("(?:^|\\n)\\s*" + selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{"));
  if (at < 0) return "";
  const open = css.indexOf("{", at);
  return css.slice(open, css.indexOf("}", open));
};

// One anatomy for every settings row: the title and its description take the
// row, and the control sits at its end. The prefs row is a two-column grid —
// the text runs, the control column fits what the control needs at the end.
describe("a settings row's anatomy", () => {
  it("puts a row's label and description first, control last", () => {
    expect(rule(settings, ".srow-meta")).toContain("flex: 1");
    expect(rule(app, ".lrow .tx")).toContain("flex: 1");
  });

  it("sends a segmented control to the row's end instead of leaving half the row blank", () => {
    expect(rules(settings, ".prefs-card > .grp")).toContain("fit-content(320px)");
    expect(rule(app, ".seg.fit")).toContain("flex: none");
  });
});
