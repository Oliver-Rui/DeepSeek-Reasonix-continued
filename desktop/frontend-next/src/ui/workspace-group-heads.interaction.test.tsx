// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "./testkit";
import { Workspaces } from "./Workspaces";
import type { TreeWorkspace } from "../port/hub";

afterEach(cleanup);

// The head writes the same folded set a row click writes: the harness keeps
// that set the way the window does, so both gestures land in one place.
function draw() {
  const tree: TreeWorkspace[] = [
    { root: "/a", name: "a", remembered: true, sessions: [{ path: "/a/1.jsonl", name: "one", title: "one" }] },
    { root: "/b", name: "b", remembered: true, sessions: [{ path: "/b/2.jsonl", name: "two", title: "two" }] },
    { root: "/auto", name: "auto", remembered: false, sessions: [{ path: "/auto/3.jsonl", name: "three", title: "three" }] },
  ];
  const Harness = () => {
    const [folded, setFolded] = useState(new Set<string>());
    const fold = (roots: string[], shut: boolean) => setFolded((prev) => {
      const next = new Set(prev);
      for (const root of roots) { if (shut) next.add(root); else next.delete(root); }
      return next;
    });
    return <Workspaces hub={{} as never} tree={tree} treeRead runtimes={[]} active=""
      folded={folded} onFold={(root, shut) => fold([root], shut)} onFoldGroup={fold}
      reload={async () => {}} onOpen={async () => {}} onFocus={() => {}} onClose={async () => {}}
      liveIds={() => []} runs={{}} onRename={() => {}} onError={() => {}}
      adder={{ add: () => {}, close: () => {}, at: null } as never} />;
  };
  render(<Harness />);
}

const head = (group: "projects" | "tasks") =>
  document.querySelector<HTMLButtonElement>(`[data-action="workspace.fold-all"][data-value="${group}"]`)!;

const row = (name: string) =>
  [...document.querySelectorAll<HTMLElement>(".wsrow")].find((el) => el.querySelector(".wsname")?.textContent === name)!;

it("folds every project from the 项目 head and leaves the task group alone", async () => {
  draw();
  const projects = head("projects");
  expect(projects.getAttribute("aria-expanded")).toBe("true");
  expect(projects.getAttribute("aria-label")).toBe("收起所有项目");
  await userEvent.click(projects);
  expect(screen.queryByRole("treeitem", { name: "one" })).toBeNull();
  expect(screen.queryByRole("treeitem", { name: "two" })).toBeNull();
  expect(screen.getByRole("treeitem", { name: "three" })).toBeTruthy();
  expect(row("a").getAttribute("aria-expanded")).toBe("false");
  expect(row("b").getAttribute("aria-expanded")).toBe("false");
  expect(projects.getAttribute("aria-expanded")).toBe("false");
  expect(projects.getAttribute("aria-label")).toBe("展开所有项目");
  await userEvent.click(projects);
  expect(screen.getByRole("treeitem", { name: "one" })).toBeTruthy();
  expect(screen.getByRole("treeitem", { name: "three" })).toBeTruthy();
});

it("folds the task group from the 任务 head and leaves the projects alone", async () => {
  draw();
  const tasks = head("tasks");
  expect(tasks.getAttribute("aria-expanded")).toBe("true");
  expect(tasks.getAttribute("aria-label")).toBe("收起所有任务");
  await userEvent.click(tasks);
  expect(screen.queryByRole("treeitem", { name: "three" })).toBeNull();
  expect(screen.getByRole("treeitem", { name: "one" })).toBeTruthy();
  expect(row("auto").getAttribute("aria-expanded")).toBe("false");
  expect(tasks.getAttribute("aria-expanded")).toBe("false");
  expect(tasks.getAttribute("aria-label")).toBe("展开所有任务");
  await userEvent.click(tasks);
  expect(screen.getByRole("treeitem", { name: "three" })).toBeTruthy();
});

it("renders a group with nothing to fold as a label, not a control", () => {
  const tree: TreeWorkspace[] = [{ root: "/empty", name: "empty", remembered: true, sessions: [] }];
  render(<Workspaces hub={{} as never} tree={tree} treeRead runtimes={[]} active="" folded={new Set()}
    onFold={() => {}} onFoldGroup={() => {}} reload={async () => {}} onOpen={async () => {}}
    onFocus={() => {}} onClose={async () => {}} liveIds={() => []} runs={{}} onRename={() => {}}
    onError={() => {}} adder={{ add: () => {}, close: () => {}, at: null } as never} />);
  const projects = head("projects");
  expect(projects.disabled).toBe(true);
  expect(projects.getAttribute("aria-expanded")).toBeNull();
});
