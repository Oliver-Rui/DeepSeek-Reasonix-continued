// @vitest-environment jsdom
import "./testkit";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Workspaces } from "./Workspaces";
import { RailSearch } from "./railsearch";
import { draftKey, readDraft, writeDraft } from "./drafts";
import type { TreeSession, TreeWorkspace } from "../port/hub";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

const sessions: TreeSession[] = [
  { path: "/sessions/a.jsonl", name: "a", title: "Alpha", runtimeId: "r1" },
  { path: "/sessions/b.jsonl", name: "b", title: "Beta" },
  { path: "/sessions/c.jsonl", name: "c", title: "Gamma", archived: true },
];

function draw(rows = sessions, scope: "all" | "archived" = "all", folded = new Set<string>(),
  tree: TreeWorkspace[] = [{ root: "/w", name: "Project", remembered: true, sessions: rows }]) {
  const hub = { removeSession: vi.fn().mockResolvedValue(undefined), removeWorkspace: vi.fn().mockResolvedValue(undefined) };
  const onArchive = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn().mockResolvedValue(undefined);
  const onOpen = vi.fn().mockResolvedValue(undefined);
  const onFocus = vi.fn();
  const onError = vi.fn();
  const add = vi.fn();
  const reload = vi.fn().mockResolvedValue(undefined);
  let live: string[] = [];
  const props = { hub: hub as never, tree, treeRead: true, runtimes: [{ id: "r1" }] as never, active: "r1", folded, onFold: vi.fn(),
    // The window folds a whole group from its label; the harness keeps that
    // set the way the rows' own chevrons read it.
    onFoldGroup: (roots: string[], shut: boolean) => {
      const next = new Set(props.folded);
      for (const root of roots) { if (shut) next.add(root); else next.delete(root); }
      props.folded = next;
      view.rerender(<RailSearch><Workspaces {...props} /></RailSearch>);
    },
    reload,
    onOpen, onFocus, onClose, liveIds: (ids: string[]) => ids.filter((id) => live.includes(id)), runs: {},
    scope, onArchive, onRename: vi.fn(), onError, adder: { add, close: vi.fn(), at: null } as never };
  const view = render(<RailSearch><Workspaces {...props} /></RailSearch>);
  return { hub, onArchive, onClose, onOpen, onFocus, onError, reload, add, removeWorkspace: hub.removeWorkspace,
    live: (ids: string[]) => { live = ids; view.rerender(<RailSearch><Workspaces {...props}
      runs={Object.fromEntries(ids.map((id) => [id, { run: "running", live: true }]))} /></RailSearch>); },
    update: (tree: TreeWorkspace[]) => { props.tree = tree; view.rerender(<RailSearch><Workspaces {...props} /></RailSearch>); },
    fold: (roots: Set<string>) => { props.folded = roots; view.rerender(<RailSearch><Workspaces {...props} /></RailSearch>); } };
}

const projectRow = () =>
  screen.getByText("Project", { selector: ".wsname" }).closest<HTMLElement>('[role="treeitem"]')!;

// Picking starts from a row's right-click menu now — the header button is gone
// on purpose — and the menu seeds the mode with the row that was clicked.
async function startSelection(row = document.querySelector<HTMLElement>(".sessrow")!) {
  fireEvent.contextMenu(row);
  await userEvent.click(screen.getByRole("menuitem", { name: /批量选择会话/ }));
}

async function selectAll() {
  await startSelection();
  // A lone displayed row arrives all-chosen from its menu, and the toggle only
  // exists while something on screen is still unpicked.
  const toggle = screen.queryByRole("button", { name: "全选当前显示的会话" });
  if (toggle) await userEvent.click(toggle);
}

it("keeps the batch entries in the row menus without occupying an idle toolbar", async () => {
  draw();
  expect(document.querySelector(".session-batch-entry, .session-batch")).toBeNull();
  // The header button is gone on purpose: picking starts from the tree's own
  // right-click menus, so the idle toolbar keeps only the view, the filter and
  // the way into a new project.
  expect(screen.queryByRole("button", { name: "选择本机会话" })).toBeNull();
  expect(screen.queryByRole("menuitem", { name: "选择本机会话" })).toBeNull();
  // The project's menu offers the whole folder at once.
  fireEvent.contextMenu(projectRow());
  const fromProject = screen.getByRole("menuitem", { name: /批量选择会话/ });
  expect(fromProject.getAttribute("data-action")).toBe("session.selection");
  expect(fromProject.getAttribute("data-value")).toBe("start");
  await userEvent.click(fromProject);
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.getByText("已选 2 个会话")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "完成选择" }));
  // The session's menu carries the same entry, seeded with the clicked row.
  fireEvent.contextMenu(screen.getByRole("treeitem", { name: /Beta/ }));
  await userEvent.click(screen.getByRole("menuitem", { name: /批量选择会话/ }));
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "删除所选会话" }));
});

it("offers no batch entry where a folder shows nothing to pick", async () => {
  draw([], "all", new Set(["/w"]));
  fireEvent.contextMenu(projectRow());
  expect((screen.getByRole("menuitem", { name: /批量选择会话/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(document.querySelector(".session-batch")).toBeNull();
});

it("starts from a folded folder with nothing the fold lets stay selected", async () => {
  draw(sessions, "all", new Set(["/w"]));
  fireEvent.contextMenu(projectRow());
  await userEvent.click(screen.getByRole("menuitem", { name: /批量选择会话/ }));
  expect(screen.queryByRole("menu")).toBeNull();
  // The folder's entry still answers while folded, and the fold prunes what it
  // seeded: a hidden row cannot stay picked.
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
  expect((screen.getByRole("button", { name: "删除所选会话" }) as HTMLButtonElement).disabled).toBe(true);
});

it("keeps opening projects and the list menu outside the project tree", async () => {
  const pane = draw();
  await userEvent.click(screen.getByRole("button", { name: "打开项目" }));
  expect(pane.add).toHaveBeenCalledOnce();
  expect(screen.queryByRole("treeitem", { name: /这台机器/ })).toBeNull();
  await startSelection();
  expect(screen.getByText("Alpha")).toBeTruthy();
});

it("selects rows with clicks and the keyboard without opening or focusing a pane", async () => {
  const pane = draw();
  await startSelection(); // Alpha arrives chosen from its menu
  const alpha = screen.getByRole("treeitem", { name: /Alpha/ });
  const beta = screen.getByRole("treeitem", { name: /Beta/ });
  await userEvent.click(beta);
  expect(alpha.getAttribute("aria-selected")).toBe("true");
  expect(beta.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("已选 2 个会话")).toBeTruthy();
  beta.focus();
  await userEvent.keyboard(" ");
  expect(beta.getAttribute("aria-selected")).toBe("false");
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  await userEvent.keyboard(" ");
  expect(beta.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("已选 2 个会话")).toBeTruthy();
  await userEvent.dblClick(screen.getByText("Alpha"));
  expect(screen.queryByRole("textbox", { name: "重命名该会话" })).toBeNull();
  expect(pane.onOpen).not.toHaveBeenCalled();
  expect(pane.onFocus).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "完成选择" }));
  // The tree's own group label takes the keyboard back: the toolbar holds no
  // entry for picking any more.
  expect(document.activeElement).toBe(document.querySelector<HTMLElement>('[data-action="workspace.fold-all"][data-value="projects"]'));
  await userEvent.click(beta);
  expect(pane.onOpen).toHaveBeenCalledWith({ root: "/w", sessionPath: "/sessions/b.jsonl" });
});

it("archives selected sessions through the same owner as an individual row", async () => {
  const pane = draw();
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "归档所选会话" }));
  await waitFor(() => expect(pane.onArchive).toHaveBeenCalledTimes(2));
  expect(pane.onArchive).toHaveBeenNthCalledWith(1, "/sessions/a.jsonl", true, "r1");
  expect(pane.onArchive).toHaveBeenNthCalledWith(2, "/sessions/b.jsonl", true, undefined);
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
});

it("restores only the selected archived rows", async () => {
  const pane = draw(sessions, "archived");
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "取消所选会话归档" }));
  await waitFor(() => expect(pane.onArchive).toHaveBeenCalledWith("/sessions/c.jsonl", false, undefined));
  expect(pane.onArchive).toHaveBeenCalledTimes(1);
});

it("confirms the selected names before deletion and lets Escape cancel without a mutation", async () => {
  const pane = draw();
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "删除所选会话" }));
  const question = screen.getByRole("alertdialog", { name: "删除 2 个会话？" });
  expect(within(question).getByText("Alpha、Beta")).toBeTruthy();
  expect(pane.hub.removeSession).not.toHaveBeenCalled();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "删除所选会话" }));
  expect(pane.onClose).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "删除所选会话" }));
  await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "删除" }));
  await waitFor(() => expect(pane.hub.removeSession).toHaveBeenCalledTimes(2));
  expect(pane.onClose).toHaveBeenCalledWith(["r1"]);
  expect(pane.onClose.mock.invocationCallOrder[0]).toBeLessThan(pane.hub.removeSession.mock.invocationCallOrder[0]!);
  expect(pane.hub.removeSession).toHaveBeenNthCalledWith(1, "/sessions/a.jsonl");
  expect(pane.hub.removeSession).toHaveBeenNthCalledWith(2, "/sessions/b.jsonl");
  expect(pane.reload).toHaveBeenCalledTimes(1);
});

it("keeps failed rows selected while removing successful rows from the batch", async () => {
  const pane = draw();
  const failure = new Error("storage unavailable");
  pane.onArchive.mockRejectedValueOnce(failure);
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "归档所选会话" }));
  await waitFor(() => expect(pane.onError).toHaveBeenCalledWith(failure));
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  expect(screen.getByRole("treeitem", { name: /Alpha/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("treeitem", { name: /Beta/ }).getAttribute("aria-selected")).toBe("false");
});

it("does not stop running sessions, including a turn that starts after selection", async () => {
  const pane = draw();
  await selectAll();
  pane.live(["r1"]);
  expect((screen.getByRole("button", { name: "归档所选会话" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "删除所选会话" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("所选会话正在运行，停止后才能操作")).toBeTruthy();
  expect(pane.onClose).not.toHaveBeenCalled();
  expect(pane.hub.removeSession).not.toHaveBeenCalled();
});

it("rechecks each running state during a batch instead of stopping a newly started turn", async () => {
  const pane = draw([sessions[0]!, { ...sessions[1]!, runtimeId: "r2" }]);
  pane.onArchive.mockImplementationOnce(async () => pane.live(["r2"]));
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "归档所选会话" }));
  await waitFor(() => expect(pane.onError).toHaveBeenCalled());
  expect(pane.onArchive).toHaveBeenCalledTimes(1);
  expect(pane.onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("treeitem", { name: /Beta/ }).getAttribute("aria-selected")).toBe("true");
});

it("keeps a session when closing its pane is refused and still deletes the other selected row", async () => {
  const pane = draw();
  const failure = new Error("pane cannot close");
  const kept = draftKey("", "/w", "/sessions/a.jsonl");
  const removed = draftKey("", "/w", "/sessions/b.jsonl");
  const remote = draftKey("other-host", "/w", "/sessions/b.jsonl");
  writeDraft(kept, "keep the refused session");
  writeDraft(removed, "delete with the removed session");
  writeDraft(remote, "keep the remote session");
  pane.onClose.mockRejectedValueOnce(failure);
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "删除所选会话" }));
  await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "删除" }));
  await waitFor(() => expect(pane.onError).toHaveBeenCalledWith(failure));
  expect(pane.hub.removeSession).toHaveBeenCalledTimes(1);
  expect(pane.hub.removeSession).toHaveBeenCalledWith("/sessions/b.jsonl");
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  expect(readDraft(kept)).toBe("keep the refused session");
  expect(readDraft(removed)).toBe("");
  expect(readDraft(remote)).toBe("keep the remote session");
});

it("keeps a pending batch from being submitted twice", async () => {
  const pane = draw();
  let release: () => void = () => {};
  pane.onArchive.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  await selectAll();
  await userEvent.dblClick(screen.getByRole("button", { name: "归档所选会话" }));
  expect(pane.onArchive).toHaveBeenCalledTimes(1);
  expect((screen.getByRole("button", { name: "完成选择" }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => release());
  await waitFor(() => expect(pane.onArchive).toHaveBeenCalledTimes(2));
});

it("selects only displayed rows and clears the selection when the query changes", async () => {
  const many = Array.from({ length: 35 }, (_, i) => ({ path: `/sessions/${i}.jsonl`, name: `${i}`, title: `Task ${i}` }));
  const pane = draw(many);
  await selectAll();
  expect(screen.getByText("已选 35 个会话")).toBeTruthy();
  await userEvent.type(screen.getByRole("searchbox", { name: "搜索会话 / 项目" }), "Task 34");
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
  expect(pane.onArchive).not.toHaveBeenCalled();
});

it("drops deleted selections when a tree refresh removes their canonical rows", async () => {
  const pane = draw();
  await selectAll();
  pane.update([{ root: "/w", name: "Project", sessions: [sessions[1]!] }]);
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "归档所选会话" }));
  await waitFor(() => expect(pane.onArchive).toHaveBeenCalledWith("/sessions/b.jsonl", true, undefined));
  expect(pane.onArchive).toHaveBeenCalledTimes(1);
});

it("removes hidden selections when projects are folded", async () => {
  const pane = draw();
  await selectAll();
  pane.update([
    { root: "/w", name: "Project", remembered: true, sessions },
    { root: "/other", name: "Other", remembered: true, sessions: [{ path: "/sessions/d.jsonl", name: "Delta" }] },
  ]);
  pane.fold(new Set(["/w"]));
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
  pane.fold(new Set());
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
  pane.fold(new Set(["/w"]));
  await userEvent.click(screen.getByRole("button", { name: "全选当前显示的会话" }));
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "取消当前显示会话的选择" }));
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "全选当前显示的会话" }));
  pane.fold(new Set(["/w", "/other"]));
  expect(screen.getByText("已选 0 个会话")).toBeTruthy();
  expect((screen.getByRole("button", { name: "删除所选会话" }) as HTMLButtonElement).disabled).toBe(true);
  expect(pane.onArchive).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "完成选择" }));
  // Every project is folded, so picking keeps no hidden row; the tree's own
  // 项目 label answers the keyboard whether the group is folded or not.
  expect(document.activeElement).toBe(document.querySelector<HTMLElement>('[data-action="workspace.fold-all"][data-value="projects"]'));
});

it("selects every loaded row of a search matching the project name, and only those", async () => {
  draw(Array.from({ length: 35 }, (_, i) => ({ path: `/sessions/${i}.jsonl`, name: `${i}`, title: `Task ${i}` })));
  await userEvent.type(screen.getByRole("searchbox", { name: "搜索会话 / 项目" }), "Project");
  await selectAll();
  expect(screen.getByText("已选 35 个会话")).toBeTruthy();
  expect(screen.getByRole("treeitem", { name: /Task 34/ })).toBeTruthy();
});

it("says 全部选中 and 全部取消 for the rows on screen", async () => {
  draw();
  await startSelection();
  expect(screen.getByText("全部选中")).toBeTruthy();
  expect(screen.queryByText("全选可见")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "全选当前显示的会话" }));
  expect(screen.getByText("全部取消")).toBeTruthy();
  expect(screen.queryByText("取消全选")).toBeNull();
});

it("enters picking from a session's menu with that session already chosen", async () => {
  const pane = draw();
  const alpha = screen.getByRole("treeitem", { name: /Alpha/ });
  fireEvent.contextMenu(alpha);
  await userEvent.click(screen.getByRole("menuitem", { name: /批量选择会话/ }));
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.getByText("已选 1 个会话")).toBeTruthy();
  expect(alpha.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("treeitem", { name: /Beta/ }).getAttribute("aria-selected")).toBe("false");
  expect(pane.onOpen).not.toHaveBeenCalled();
  expect(pane.onFocus).not.toHaveBeenCalled();
});

it("asks once and removes the selected sessions' projects from the list", async () => {
  const rooted: TreeSession[] = [
    { path: "/w/a.jsonl", name: "a", title: "Alpha", workspaceRoot: "/w" },
    { path: "/v/b.jsonl", name: "b", title: "Beta", workspaceRoot: "/v" },
  ];
  const pane = draw(rooted, "all", new Set(), [
    { root: "/w", name: "First", remembered: true, sessions: [rooted[0]!] },
    { root: "/v", name: "Second", remembered: true, sessions: [rooted[1]!] },
  ]);
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "移除项目" }));
  const question = screen.getByRole("alertdialog", { name: "从列表移除 2 个项目？" });
  expect(within(question).getByText("First、Second")).toBeTruthy();
  expect(within(question).getByText("项目与其中会话将从列表移除；会话记录仍保留在磁盘上。")).toBeTruthy();
  expect(pane.removeWorkspace).not.toHaveBeenCalled();
  expect(pane.hub.removeSession).not.toHaveBeenCalled();
  await userEvent.click(within(question).getByRole("button", { name: "移除" }));
  await waitFor(() => expect(pane.removeWorkspace).toHaveBeenCalledTimes(2));
  expect(pane.removeWorkspace).toHaveBeenNthCalledWith(1, "/w");
  expect(pane.removeWorkspace).toHaveBeenNthCalledWith(2, "/v");
  expect(pane.reload).toHaveBeenCalledTimes(1);
  expect(pane.onError).not.toHaveBeenCalled();
});

it("lets Escape leave every project in place", async () => {
  const rooted: TreeSession[] = [
    { path: "/w/a.jsonl", name: "a", title: "Alpha", workspaceRoot: "/w" },
    { path: "/v/b.jsonl", name: "b", title: "Beta", workspaceRoot: "/v" },
  ];
  const pane = draw(rooted, "all", new Set(), [
    { root: "/w", name: "First", remembered: true, sessions: [rooted[0]!] },
    { root: "/v", name: "Second", remembered: true, sessions: [rooted[1]!] },
  ]);
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "移除项目" }));
  expect(screen.getByRole("alertdialog", { name: "从列表移除 2 个项目？" })).toBeTruthy();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(pane.removeWorkspace).not.toHaveBeenCalled();
  expect(pane.reload).not.toHaveBeenCalled();
});

it("keeps removing the other project when one is refused", async () => {
  const rooted: TreeSession[] = [
    { path: "/w/a.jsonl", name: "a", title: "Alpha", workspaceRoot: "/w" },
    { path: "/v/b.jsonl", name: "b", title: "Beta", workspaceRoot: "/v" },
  ];
  const pane = draw(rooted, "all", new Set(), [
    { root: "/w", name: "First", remembered: true, sessions: [rooted[0]!] },
    { root: "/v", name: "Second", remembered: true, sessions: [rooted[1]!] },
  ]);
  pane.removeWorkspace.mockRejectedValueOnce(new Error("panes still running"));
  await selectAll();
  await userEvent.click(screen.getByRole("button", { name: "移除项目" }));
  await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "移除" }));
  await waitFor(() => expect(pane.onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error)));
  expect(pane.removeWorkspace).toHaveBeenCalledTimes(2);
  expect(pane.removeWorkspace).toHaveBeenNthCalledWith(2, "/v");
  expect(pane.reload).toHaveBeenCalledTimes(1);
});

it("skips the project of a running session and removes the rest", async () => {
  const rooted: TreeSession[] = [
    { path: "/w/a.jsonl", name: "a", title: "Alpha", workspaceRoot: "/w", runtimeId: "r1" },
    { path: "/v/b.jsonl", name: "b", title: "Beta", workspaceRoot: "/v" },
  ];
  const pane = draw(rooted, "all", new Set(), [
    { root: "/w", name: "First", remembered: true, sessions: [rooted[0]!] },
    { root: "/v", name: "Second", remembered: true, sessions: [rooted[1]!] },
  ]);
  await selectAll();
  pane.live(["r1"]);
  expect((screen.getByRole("button", { name: "归档所选会话" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "删除所选会话" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "移除项目" }) as HTMLButtonElement).disabled).toBe(false);
  await userEvent.click(screen.getByRole("button", { name: "移除项目" }));
  expect(screen.getByRole("alertdialog", { name: "从列表移除 1 个项目？" })).toBeTruthy();
  await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "移除" }));
  await waitFor(() => expect(pane.removeWorkspace).toHaveBeenCalledTimes(1));
  expect(pane.removeWorkspace).toHaveBeenCalledWith("/v");
  expect(pane.reload).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(pane.onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error)));
});
