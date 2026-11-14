import { useContext } from "react";
import { t } from "../i18n";
import { RailFilterContext } from "./railfilter";

/** The row above the tree: the view's name and the session filter. The name
 *  is a label, not a control — this build has the one view, so the word only
 *  says what the column below is. Picking conversations starts from the tree's
 *  own right-click menus; folding a group lives on the group labels; ordering
 *  by recency lives in the filter menu, beside the scopes it reorders. */
export function ProjectsHeader() {
  const filter = useContext(RailFilterContext);
  return (
    <div className="projects-header">
      <div className="projects-tabs">
        <span className="vtab" aria-current="true">{t("session.task_list")}</span>
        <span className="projects-spacer" />
        {filter}
      </div>
    </div>
  );
}
