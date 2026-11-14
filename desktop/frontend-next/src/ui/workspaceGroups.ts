import type { TreeWorkspace } from "../port/hub";

export interface WorkspaceGroups {
  projects: TreeWorkspace[];
  tasks: TreeWorkspace[];
}

/** Splits the tree into the two runs the sidebar draws, each keeping the order
 *  it was given: chosen folders are 项目, and every folder the window itself
 *  opened in — the kernel marks only chosen folders `remembered` — is 任务.
 *  More than one such folder can be listed when a pane drives an unremembered
 *  root, so the task group is a list, never a single row. */
export function workspaceGroups(tree: TreeWorkspace[]): WorkspaceGroups {
  return {
    projects: tree.filter((ws) => !!ws.remembered),
    tasks: tree.filter((ws) => !ws.remembered),
  };
}

/** How a group head reads and writes the fold: the roots it governs are the
 *  run's rows that can fold at all, and the head counts as folded only when
 *  every one of them is — the same rows' chevrons read this set back. */
export interface GroupFold {
  roots: string[];
  canFold: boolean;
  folded: boolean;
}

export function groupFold(list: TreeWorkspace[], folded: Set<string>, canFoldRow: (ws: TreeWorkspace) => boolean): GroupFold {
  const roots = list.filter(canFoldRow).map((ws) => ws.root);
  return { roots, canFold: roots.length > 0, folded: roots.length > 0 && roots.every((root) => folded.has(root)) };
}
