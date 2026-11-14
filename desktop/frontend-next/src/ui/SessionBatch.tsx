import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { current, t } from "../i18n";
import type { HubPort, TreeSession } from "../port/hub";
import { StudioIcon } from "./StudioIcon";
import { clearDraftForSession } from "./drafts";

/** The selected rows that are still on screen; a row that leaves the displayed set leaves the selection. */
export function useSelectedRows(displayed: TreeSession[], selection: Set<string> | null, setSelection: Dispatch<SetStateAction<Set<string> | null>>): TreeSession[] {
  const key = displayed.map((row) => row.path).join("\n");
  useEffect(() => {
    const paths = new Set(key ? key.split("\n") : []);
    setSelection((current) => {
      if (!current) return current;
      const next = new Set([...current].filter((path) => paths.has(path)));
      return next.size === current.size ? current : next;
    });
  }, [key, setSelection]);
  return [...new Map(displayed.filter((row) => selection?.has(row.path)).map((row) => [row.path, row])).values()];
}

export function SessionBatch({ hub, selection, selected, displayed, onSelect, onExit, onBusy, onClose, onArchive, rememberedProjects, onRemoveWorkspaces, liveIds, reload, onError }: {
  hub: HubPort;
  selection: Set<string> | null;
  selected: TreeSession[];
  displayed: TreeSession[];
  onSelect: (next: Set<string> | null) => void;
  onExit: () => void;
  onBusy: (busy: boolean) => void;
  onClose: (ids: string[]) => Promise<void>;
  onArchive: (path: string, archived: boolean, runtimeId?: string) => Promise<void>;
  /** The projects a person chose, by root and name: what the removal question is asked about. */
  rememberedProjects: { root: string; name: string }[];
  /** Takes each project out of the list through the single-removal flow; refusals are reported there. */
  onRemoveWorkspaces: (roots: string[]) => Promise<void>;
  liveIds: (ids: string[]) => string[];
  reload: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "remove" | "archive" | "restore" | "delete" | "removing">("idle");
  const wasSelecting = useRef(selection !== null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const pending = phase !== "idle" && phase !== "confirm" && phase !== "remove";
  const asking = phase === "confirm" || phase === "remove";
  const liveSelected = new Set(liveIds(selected.flatMap((row) => row.runtimeId ? [row.runtimeId] : [])));
  const running = liveSelected.size > 0;
  const blocked = pending || running || selected.length === 0;
  const all = displayed.length > 0 && displayed.every((row) => selection?.has(row.path));
  const restore = selected.length > 0 && selected.every((row) => row.archived);
  const cancel = () => { setPhase("idle"); onBusy(false); deleteButton.current?.focus(); };
  useEffect(() => {
    if (wasSelecting.current && selection === null) {
      onExit();
    }
    wasSelecting.current = selection !== null;
  }, [selection !== null]);
  useEffect(() => {
    if (phase === "idle" && selection !== null) (deleteButton.current?.disabled ? doneButton.current : deleteButton.current)?.focus();
  }, [phase, selection !== null]);

  const run = async (action: "archive" | "restore" | "delete") => {
    if (blocked) return;
    setPhase(action);
    onBusy(true);
    const failed = new Set<string>();
    let firstError: unknown;
    let removed = false;
    for (const row of selected) {
      try {
        if (row.runtimeId && liveIds([row.runtimeId]).length > 0) throw new Error(t("session.selected_sessions_are_running_stop"));
        if (action === "delete") {
          if (row.runtimeId) await onClose([row.runtimeId]);
          await hub.removeSession(row.path);
          clearDraftForSession("", row.path);
          removed = true;
        } else {
          await onArchive(row.path, action === "archive", row.runtimeId);
        }
      } catch (e) {
        failed.add(row.path);
        firstError ??= e;
      }
    }
    if (removed) {
      try { await reload(); } catch (e) { firstError ??= e; }
    }
    onSelect(failed);
    setPhase("idle");
    onBusy(false);
    if (firstError) onError(firstError);
    deleteButton.current?.focus();
  };

  // The projects the selected rows write to. A row without a workspace root
  // names no project, and a folder nobody chose is not the list's to remove.
  const removeCandidates = rememberedProjects.filter((p) => selected.some((row) => row.workspaceRoot === p.root));
  // A project with a running conversation keeps its place: removal would stop
  // work the batch never promised to stop. The others still leave.
  const removable = removeCandidates.filter((p) => !selected.some((row) => row.workspaceRoot === p.root && row.runtimeId && liveSelected.has(row.runtimeId)));

  const runRemove = async () => {
    if (pending) return;
    setPhase("removing");
    // A turn may have started while the question was up: ask once more, and
    // let the projects that can still leave do so.
    const live = new Set(liveIds(selected.flatMap((row) => row.runtimeId ? [row.runtimeId] : [])));
    const go: string[] = [];
    let stopped = false;
    for (const p of removeCandidates) {
      if (selected.some((row) => row.workspaceRoot === p.root && row.runtimeId && live.has(row.runtimeId))) stopped = true;
      else go.push(p.root);
    }
    try {
      await onRemoveWorkspaces(go);
    } catch (e) {
      onError(e);
    }
    setPhase("idle");
    onBusy(false);
    if (stopped) onError(new Error(t("session.selected_sessions_are_running_stop")));
  };

  if (selection === null) return null;
  return (
    <div className="session-batch" aria-busy={pending}>
      <div className="session-batch-head">
        <span role="status">{t("session.n_sessions_selected", { n: selected.length })}</span>
        <button ref={doneButton} className="x" data-action="session.selection" data-value="end" disabled={pending}
          aria-label={t("session.done_selecting")} title={t("session.done_selecting")}
          onClick={() => { cancel(); onSelect(null); }}><StudioIcon name="close" /></button>
      </div>
      <div className="session-batch-actions">
        <button data-action="session.selection" data-value={all ? "clear" : "all"} disabled={phase !== "idle" || displayed.length === 0}
          aria-label={t(all ? "session.deselect_displayed_sessions" : "session.select_all_displayed_sessions")}
          onClick={() => {
            const next = new Set(selection);
            for (const row of displayed) { if (all) next.delete(row.path); else next.add(row.path); }
            onSelect(next);
          }}>{t(all ? "session.deselect_everything" : "session.select_all")}</button>
        <button data-action="session.batch-archive" data-value={restore ? "restore" : "archive"} disabled={blocked || asking}
          aria-label={t(restore ? "session.unarchive_selected_sessions" : "session.archive_selected_sessions")} onClick={() => void run(restore ? "restore" : "archive")}>{t(restore ? "common.unarchive" : "common.archived_2")}</button>
        <button ref={deleteButton} data-action="session.batch-delete" disabled={blocked || asking} aria-label={t("session.delete_selected_sessions")}
          onClick={() => { setPhase("confirm"); onBusy(true); }}>{t("common.delete")}</button>
        <button ref={removeButton} data-action="session.batch-remove" disabled={pending || asking || removable.length === 0}
          onClick={() => { setPhase("remove"); onBusy(true); }}>{t("session.remove_projects")}</button>
      </div>
      {running && <p>{t("session.selected_sessions_are_running_stop")}</p>}
      {pending && <p role="status">{t("session.processing_selected_sessions")}</p>}
      {phase === "confirm" && (
        <div className="wsconfirm" role="alertdialog" aria-label={t("session.delete_n_sessions", { n: selected.length })}
          data-action-keydown="layer.dismiss" onKeyDown={(ev) => { if (ev.key === "Escape") { ev.stopPropagation(); cancel(); } }}>
          <div className="wsconfirm-t">
            <span className="q">{t("session.delete_n_sessions", { n: selected.length })}</span>
            <span className="session-batch-names">{selected.map((row) => row.title || row.name).join(current() === "zh" ? "、" : ", ")}</span>
            <span className="h">{t("common.deletes_it_together_with_its")}</span>
          </div>
          <div className="wsconfirm-a">
            <button autoFocus data-action="layer.dismiss" onClick={cancel}>{t("common.cancel")}</button>
            <button data-action="session.batch-delete" data-danger="" disabled={blocked} onClick={() => void run("delete")}>{t("common.delete")}</button>
          </div>
        </div>
      )}
      {phase === "remove" && (
        <div className="wsconfirm" role="alertdialog" aria-label={t("session.remove_n_projects", { n: removable.length })}
          data-action-keydown="layer.dismiss" onKeyDown={(ev) => { if (ev.key === "Escape") { ev.stopPropagation(); cancel(); } }}>
          <div className="wsconfirm-t">
            <span className="q">{t("session.remove_n_projects", { n: removable.length })}</span>
            <span className="session-batch-names">{removable.map((p) => p.name).join(current() === "zh" ? "、" : ", ")}</span>
            <span className="h">{t("session.remove_projects_hint")}</span>
          </div>
          <div className="wsconfirm-a">
            <button autoFocus data-action="layer.dismiss" onClick={cancel}>{t("common.cancel")}</button>
            <button data-action="session.batch-remove" data-danger="" onClick={() => void runRemove()}>{t("common.remove")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
