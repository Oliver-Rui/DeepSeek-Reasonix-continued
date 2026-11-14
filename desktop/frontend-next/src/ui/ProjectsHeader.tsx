import { useContext } from "react";
import { t } from "../i18n";
import type { Adder } from "./addws";
import { StudioIcon } from "./StudioIcon";
import { RailFilterContext } from "./railfilter";

/** The row above the tree: which view is on, the session filter, and the way
 *  into a new project. Picking conversations starts from the tree's own
 *  right-click menus; folding a whole group lives on the group labels in the
 *  tree; ordering by recency lives in the filter menu, beside the scopes it
 *  reorders, rather than as a control of its own up here. */
export function ProjectsHeader({ adder }: {
  adder: Adder;
}) {
  const filter = useContext(RailFilterContext);
  return (
    <div className="projects-header">
      <div className="projects-tabs">
        <div className="vtabs" role="group" aria-label={t("session.session_view")}>
          <button type="button" className="vtab" data-action="session.view" data-value="projects" aria-pressed="true">{t("session.task_list")}</button>
        </div>
        <span className="projects-spacer" />
        {filter}
        <button className="projects-add" data-busy={adder.busy ? "" : undefined} disabled={adder.busy}
          title={t("session.open_project")} aria-label={t("session.open_project")} data-action="workspace.add" onClick={() => adder.add()}>
          <StudioIcon name="plus" />
        </button>
      </div>
    </div>
  );
}
