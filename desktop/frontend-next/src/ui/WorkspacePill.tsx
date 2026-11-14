import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n";
import type { PickerProject } from "./useNewSessionPicker";
import { StudioIcon } from "./StudioIcon";
import { listenAction } from "./listen";
import { beside, pinToViewport, useFollow, zoom } from "./place";
import { useProjectChoiceSurface } from "./projectchoice";

/** The composer's project pill: the new conversation's guide. A fresh pane
 *  shows it above the card so the person says where the conversation will
 *  live — a project, or 不使用项目 — and once it has been placed, or a turn
 *  has been written, the pill goes away and the sidebar's groups carry the
 *  answer. Nothing reintroduces it; typing straight into a fresh pane makes
 *  the task it was going to become anyway. */
export function WorkspacePill() {
  const { port, root, hasContent, canSwitch, running, projects, adder, onChanged, onSwitched, onError } = useProjectChoiceSurface();
  const [switching, setSwitching] = useState(false);
  // Placed: this pane has had its say — a project picked, or 不使用项目
  // confirmed — so the guide has done its work.
  const [placed, setPlaced] = useState(false);
  const [choice, setChoice] = useState(false);
  const [needle, setNeedle] = useState("");
  // 添加新项目's submenu, and the blank-project dialog the submenu opens.
  const [menu, setMenu] = useState(false);
  const [blank, setBlank] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [noPicker, setNoPicker] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);

  const run = useCallback((call: () => Promise<unknown>) => {
    setSwitching(true);
    void call().then(() => { onChanged(); onSwitched(); }).catch(onError)
      .finally(() => setSwitching(false));
  }, [onChanged, onSwitched, onError]);

  const close = useCallback(() => { returnFocus.current = true; setChoice(false); setMenu(false); setNeedle(""); }, []);
  useEffect(() => {
    if (!choice && returnFocus.current) { returnFocus.current = false; trigger.current?.focus(); }
  }, [choice]);
  // A turn starting holds the gate the switch would need; the palette says so
  // by leaving, the way it does while a branch moves underneath it.
  useEffect(() => { if (running && (choice || blank)) { close(); setBlank(false); } }, [running, choice, blank, close]);

  // The name the pill carries: the remembered project holding this pane's
  // folder — or the invitation, when the pane works outside any of them. The
  // auto workspace belongs to no project, so a task pane shows the invitation.
  const current = projects.find((p) => p.root === root);
  const label = current?.name ?? t("session.enter_a_project");
  const shown = needle
    ? projects.filter((p) => p.name.toLowerCase().includes(needle.trim().toLowerCase()))
    : projects;

  const choose = (at: PickerProject | null) => {
    setChoice(false);
    setMenu(false);
    setNeedle("");
    setPlaced(true);
    run(at === null ? () => port.setWorkspaceAuto() : () => port.setWorkspace(at.root));
  };

  // 新建空白项目: an empty, named folder inside the folder the picker returned,
  // then the pane moves there — that is the project it was asking for.
  const openBlank = () => {
    setBlank(true);
    setChoice(false);
    setMenu(false);
    setNeedle("");
    setName(t("session.untitled_project"));
    setParent("");
    setNoPicker(false);
  };
  const pickParent = () => {
    // A picker without a desktop host to answer it — null, or an error — falls
    // back to typing the folder: the path field replaces the picker row. The
    // start folder is the platform's own: a fresh conversation works inside the
    // app's own area, and a new project is nobody's subfolder of it.
    void adder?.pickFolder("").then((dir) => {
      if (dir) setParent(dir);
      else setNoPicker(true);
    }).catch(() => setNoPicker(true));
  };
  const createBlank = () => {
    const named = name.trim();
    const at = noPicker ? parent.trim() : parent;
    if (!adder || !named || !at || switching) return;
    setSwitching(true);
    void adder.addNamed(named, at)
      .then(async (workspace) => {
        await port.setWorkspace(workspace.root);
        onChanged();
        onSwitched();
        setBlank(false);
      })
      .catch(onError)
      .finally(() => setSwitching(false));
  };

  const put = useCallback(() => {
    if (!trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const height = panel.current.offsetHeight * zoom();
    pinToViewport(panel.current, anchor.left, beside(anchor, height, innerHeight, "above", 10), 12);
  }, []);
  const putCard = useCallback(() => {
    if (!card.current) return;
    const box = card.current.getBoundingClientRect();
    pinToViewport(card.current, (innerWidth - box.width) / 2, (innerHeight - box.height) / 2, 12);
  }, []);
  useFollow(choice, put, `${switching}:${projects.length}`, { anchor: trigger, container: panel });
  useEffect(() => {
    if (!choice) return;
    // No guided pick: the palette opens quiet, nothing pre-highlighted — the
    // rows are a list to choose from, not a selection already under way.
    panel.current?.focus();
    const outside = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); close(); }
      if (event.key !== "Tab") return;
      const stops = Array.from(panel.current?.querySelectorAll<HTMLElement>("input, button:not(:disabled)") ?? []);
      const edge = event.shiftKey ? stops[0] : stops.at(-1);
      if (document.activeElement === edge) { event.preventDefault(); (event.shiftKey ? stops.at(-1) : stops[0])?.focus(); }
    };
    const stopOutside = listenAction(window, "mousedown", { action: "workspace.configure", listener: outside as EventListener });
    const stopKey = listenAction(window, "keydown", { action: "workspace.configure", listener: key as EventListener }, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(put);
    if (panel.current) observer?.observe(panel.current);
    return () => { stopOutside(); stopKey(); observer?.disconnect(); };
  }, [choice, put, close]);
  // The blank-project dialog is its own card: centered, Escape and outside
  // clicks dismiss it, and its buttons are the only way through.
  useEffect(() => {
    if (!blank) return;
    card.current?.querySelector<HTMLInputElement>("input")?.select();
    const outside = (event: MouseEvent) => {
      if (!card.current?.contains(event.target as Node)) setBlank(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); setBlank(false); }
    };
    const stopOutside = listenAction(window, "mousedown", { action: "workspace.create", listener: outside as EventListener });
    const stopKey = listenAction(window, "keydown", { action: "workspace.create", listener: key as EventListener }, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(putCard);
    if (card.current) observer?.observe(card.current);
    return () => { stopOutside(); stopKey(); observer?.disconnect(); };
  }, [blank, putCard]);

  // The guide only stands where it can still guide: a pane that has been
  // placed, or that already carries a transcript, shows nothing.
  if (placed || hasContent) return null;
  return <div className="studio-branch-pop">
    <button ref={trigger} type="button" className="mode plain studio-branch worktree-trigger" data-action="workspace.configure"
      title={`${t("session.the_sessions_project")}\n${label}\n${root}`}
      aria-haspopup="dialog" aria-expanded={choice}
      disabled={!canSwitch || running || switching}
      onClick={() => (choice ? close() : setChoice(true))}>
      <StudioIcon name="folder" /><span className="lb">{switching ? t("session.switching_project") : label}</span><StudioIcon name="down" />
    </button>
    {choice && createPortal(<div ref={panel} className="workspace-palette" role="dialog" aria-label={t("session.the_sessions_project")} tabIndex={-1}>
      <label className="workspace-palette-search">
        <StudioIcon name="search" />
        <input type="search" placeholder={t("session.search_projects")}
          value={needle} onChange={(ev) => setNeedle(ev.currentTarget.value)} />
      </label>
      <div className="worktree-sources" role="listbox" aria-label={t("session.the_sessions_project")}>
        {shown.map((p) => (
          <button key={p.key} data-action="workspace.project" data-target={p.root} type="button" role="option"
            aria-selected={p.root === root} data-current={p.root === root ? "" : undefined} title={p.root}
            disabled={switching} onClick={() => choose(p)}>
            <StudioIcon name={p.host ? "server" : "folder"} />
            <span className="workspace-palette-branch">{p.name}</span>
            {p.root === root && <small>{t("common.now")}</small>}
          </button>
        ))}
        {shown.length === 0 && <p className="workspace-palette-empty">{projects.length === 0 ? t("session.no_folders_yet") : t("session.no_project_matches")}</p>}
      </div>
      <div className="worktree-sources">
        {adder && <div>
          <button data-action="workspace.add-menu" type="button" aria-expanded={menu} disabled={switching || adder.busy}
            onClick={() => setMenu((on) => !on)}>
            <StudioIcon name="plus" /><span className="workspace-palette-branch">{t("session.add_a_new_project")}</span><StudioIcon name={menu ? "up" : "down"} />
          </button>
          {menu && <div className="workspace-palette-submenu">
            <button data-action="workspace.add-blank" type="button" disabled={switching || adder.busy} onClick={openBlank}>
              <StudioIcon name="plus" /><span className="workspace-palette-branch">{t("session.new_blank_project")}</span>
            </button>
            <button data-action="workspace.add-existing" type="button" disabled={switching || adder.busy}
              onClick={() => { close(); adder.add(); }}>
              <StudioIcon name="folder" /><span className="workspace-palette-branch">{t("session.use_existing_folder")}</span>
            </button>
          </div>}
        </div>}
        <button data-action="workspace.project" type="button" disabled={switching} onClick={() => choose(null)}>
          <StudioIcon name="close" /><span className="workspace-palette-branch">{t("session.use_no_project")}</span>
        </button>
      </div>
      <p className="workspace-palette-note">{t("session.switch_fresh_conversation")}</p>
    </div>, document.body)}
    {blank && createPortal(<div ref={card} className="workspace-blank" role="dialog" aria-label={t("session.new_blank_project")}>
      <div className="workspace-blank-head">
        <span className="workspace-blank-mark"><StudioIcon name="folder" /></span>
        <button data-action="layer.dismiss" className="workspace-palette-close" aria-label={t("common.close")} onClick={() => setBlank(false)}><StudioIcon name="close" /></button>
      </div>
      <h2>{t("session.new_blank_project")}</h2>
      <label className="workspace-blank-field">
        <span>{t("session.project_name")}</span>
        <input value={name} onChange={(ev) => setName(ev.currentTarget.value)}
          onKeyDown={(ev) => { if (ev.key === "Enter") createBlank(); }} />
      </label>
      <div className="workspace-blank-field">
        <span>{t("session.source_folder")}</span>
        <div className="workspace-blank-pick" data-empty={parent || !noPicker ? undefined : ""}>
          {parent ? (
            <button type="button" data-action="workspace.add-existing" title={parent} onClick={pickParent}>
              <StudioIcon name="folder" /><span>{parent}</span>
            </button>
          ) : noPicker ? (
            <input type="text" placeholder={t("session.the_folder_picker_cannot_open")}
              value={parent} onChange={(ev) => setParent(ev.currentTarget.value)} />
          ) : (
            <button type="button" data-action="workspace.add-existing" onClick={pickParent}>
              <StudioIcon name="folder" /><span>{t("session.choose_folder")}</span>
            </button>
          )}
          <small>{t("session.blank_project_lands_here")}</small>
        </div>
      </div>
      <p className="workspace-blank-hint">{t("session.name_a_folder_first")}</p>
      <div className="workspace-blank-go">
        <button type="button" data-action="layer.dismiss" disabled={switching} onClick={() => setBlank(false)}>{t("common.cancel")}</button>
        <button type="button" className="pick" data-action="workspace.create" disabled={switching || !name.trim() || !(parent.trim())}
          onClick={createBlank}>{t("session.create_the_project")}</button>
      </div>
    </div>, document.body)}
  </div>;
}
