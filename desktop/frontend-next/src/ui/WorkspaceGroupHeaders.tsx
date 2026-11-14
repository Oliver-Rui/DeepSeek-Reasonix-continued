import { t } from "../i18n";
import { StudioIcon } from "./StudioIcon";

const WORDS = {
  projects: {
    expand: "session.expand_all_projects",
    collapse: "session.collapse_all_projects",
    searching: "session.projects_expand_automatically_while_searching",
  },
  tasks: {
    expand: "session.expand_all_tasks",
    collapse: "session.collapse_all_tasks",
    searching: "session.tasks_expand_automatically_while_searching",
  },
} as const;

/** The tree's two standing labels: folders the person chose (项目), and the
 *  folder the window itself opened in (任务). Each label carries its run's
 *  fold-all, writing the same folded set the rows' own chevrons read, so one
 *  click rests the whole group and every chevron agrees with the label. */
export function WorkspaceGroupHead({ group, folded, canFold, searching, onToggle }: {
  group: "projects" | "tasks";
  folded: boolean;
  canFold?: boolean;
  searching?: boolean;
  onToggle?: () => void;
}) {
  const label = group === "projects" ? t("common.project") : t("session.tasks");
  if (!onToggle) return <div className="wsgroup"><span>{label}</span></div>;
  const words = WORDS[group];
  const said = t(searching ? words.searching : folded ? words.expand : words.collapse);
  return (
    <button type="button" className="wsgroup" data-action="workspace.fold-all" data-value={group}
      disabled={!canFold || searching} aria-expanded={canFold ? !folded : undefined}
      title={said} aria-label={said} onClick={onToggle}>
      <span>{label}</span>
      <StudioIcon name="down" className="wschev" data-open={canFold && !folded ? "" : undefined} data-leaf={canFold ? undefined : ""} />
    </button>
  );
}
