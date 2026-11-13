import { t } from "../i18n";
import { StudioIcon } from "./StudioIcon";

/** The tree's two standing labels: folders the person chose (项目), and the
 *  folder the window itself opened in (任务). A label names its group's rows
 *  rather than replacing them — those rows keep working like any other. */
export function WorkspaceGroupHead({ group }: { group: "projects" | "tasks" }) {
  return (
    <div className="wsgroup">
      <StudioIcon name={group === "projects" ? "folder" : "tasks"} />
      <span>{group === "projects" ? t("common.project") : t("session.tasks")}</span>
    </div>
  );
}
