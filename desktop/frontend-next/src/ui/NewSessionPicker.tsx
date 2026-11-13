import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n";
import type { Adder } from "./addws";
import { StudioIcon } from "./StudioIcon";
import { useModalFocus } from "./useModalFocus";
import type { PickerProject } from "./useNewSessionPicker";

// 新建会话's one gate: which project does this session belong to? The rows are
// the remembered projects, each naming the folder it opens; 创建项目 hands the
// question to the folder adder, whose own flow opens the session once the tree
// has re-read it; and the last row is the escape — work outside any project,
// which the kernel answers with its own auto workspace when no root is sent.
export function NewSessionPicker({ projects, adder, onPick, onClose }: {
  projects: PickerProject[];
  adder: Adder;
  onPick: (project: PickerProject | null) => void;
  onClose: () => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  useModalFocus(sheet);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  useEffect(() => {
    const at = sheet.current;
    if (!at) return;
    (at.querySelector("input") ?? at.querySelector("button"))?.focus();
  }, []);

  // With a folder or two the list is the whole answer; search appears only when
  // the list is long enough to need it, as the scope picker decides it.
  const searchable = projects.length > 8;
  const needle = q.trim().toLowerCase();
  const shown = projects.filter((p) =>
    !needle || p.name.toLowerCase().includes(needle) || p.root.toLowerCase().includes(needle));

  return createPortal(
    <div className="pickveil" role="dialog" aria-modal="true" aria-label={t("session.pick_a_project")} ref={sheet}>
      <div className="pickcard newsession">
        <h2>{t("session.pick_a_project")}</h2>
        {searchable && (
          <input className="pickq" value={q} placeholder={t("ext.search_projects")}
            onChange={(e) => setQ(e.target.value)} />
        )}
        <div className="picklist">
          {shown.map((p) => (
            <button key={p.key} className="pickrow" data-action="session.new"
              data-target={p.host ? `${p.host} ${p.root}` : p.root}
              onClick={() => { onClose(); onPick(p); }}>
              <StudioIcon name={p.host ? "server" : "folder"} />
              <span className="who">
                <b>{p.name}</b>
                <small>{p.root}</small>
              </span>
              {p.host && <small>SSH</small>}
            </button>
          ))}
          <button className="pickrow" data-action="workspace.add" onClick={() => { onClose(); adder.add(); }}>
            <StudioIcon name="plus" /><span>{t("session.create_a_project")}</span>
          </button>
        </div>
        <div className="pickact">
          <button className="escape" data-action="session.new" onClick={() => { onClose(); onPick(null); }}>
            <span>{t("session.work_without_a_project")}</span>
            <StudioIcon name="chevron" />
          </button>
          <button data-action="layer.dismiss" onClick={onClose}>{t("common.cancel")}</button>
        </div>
      </div>
    </div>, document.body,
  );
}
