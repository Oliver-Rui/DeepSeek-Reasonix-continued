import { useCallback, useMemo, useState } from "react";
import type { RuntimeView, TreeWorkspace } from "../port/hub";
import type { RemoteHost } from "../port/remote";
import { remoteWorkspaces } from "./remoteProjects";

export interface PickerProject {
  key: string;
  name: string;
  root: string;
  /** Set for a project saved on another machine: opening it dials that host. */
  host?: string;
}

// The rows the picker offers: the folders this machine remembers — a window
// always has a root, and only remembered says it was chosen — then the ones
// saved on each machine in the book. A missing folder cannot open a session,
// and the unremembered row is the 任务 area, not a project.
export function pickerProjects(tree: TreeWorkspace[], remotes: RemoteHost[] | null,
  remoteTrees: Record<string, TreeWorkspace[] | null>, runtimes: RuntimeView[]): PickerProject[] {
  const local = tree.filter((ws) => ws.remembered && !ws.missing)
    .map((ws) => ({ key: ws.root, name: ws.name, root: ws.root }));
  const remote = (remotes ?? []).flatMap((host) =>
    remoteWorkspaces(host, remoteTrees[host.name], runtimes.filter((rt) => rt.host === host.name))
      .filter((ws) => (ws.remembered || ws.booked) && !ws.missing)
      .map((ws) => ({ key: JSON.stringify([host.name, ws.root]), name: ws.name, root: ws.root, host: host.name })));
  return [...local, ...remote];
}

/** 新建会话's one gate. Every rootless entry — the nav rail, the sidebar's rows
 *  and palette, the empty panes area — asks which project a session belongs to
 *  before the kernel hears about it; only the per-project 新建 in the tree
 *  bypasses it, because its row already names the project. */
export function useNewSessionPicker({ tree, remotes, remoteTrees, runtimes, openPane, openRemotePane, fail }: {
  tree: TreeWorkspace[];
  remotes: RemoteHost[] | null;
  remoteTrees: Record<string, TreeWorkspace[] | null>;
  runtimes: RuntimeView[];
  openPane: (req: { root?: string }) => Promise<void>;
  openRemotePane: (host: string, workspace?: string) => Promise<void>;
  fail: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const projects = useMemo(() => pickerProjects(tree, remotes, remoteTrees, runtimes),
    [tree, remotes, remoteTrees, runtimes]);
  // The sidebar hands 新建会话 on as an awaited opener, so opening the picker
  // keeps that shape even though a dialog is all it does.
  const showPicker = useCallback(async () => { setOpen(true); }, []);
  const hidePicker = useCallback(() => setOpen(false), []);
  const pickProject = useCallback((project: PickerProject | null) => {
    // Omitting the root is the contract: the kernel falls back through its
    // launch workspaces to its own auto workspace. A computed path would name
    // a project the kernel never remembered.
    if (!project) void openPane({}).catch(fail);
    else if (project.host) void openRemotePane(project.host, project.root).catch(fail);
    else void openPane({ root: project.root }).catch(fail);
  }, [openPane, openRemotePane, fail]);
  return { pickerOpen: open, projects, showPicker, hidePicker, pickProject };
}
