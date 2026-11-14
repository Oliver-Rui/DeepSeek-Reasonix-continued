import { t } from "../i18n";
import type { AgentPort } from "../port/port";
import { usePeers } from "./usePeers";
import { wording } from "./peerthreads";

const POLL_MS = 3000;

/** The sessions this conversation dispatched tasks to (会话互聊 peers) and
 *  where each reply stands, polled live off this pane's own port — not the
 *  active pane's thread map, which would cross wires between panes. */
export function DispatchThreadsBar({ port, onOpen }: { port: AgentPort; onOpen?: (path: string) => void }) {
  const { state } = usePeers(port, POLL_MS);
  const threads = state.enabled ? (state.threads ?? []) : [];
  if (threads.length === 0) return null;
  return (
    <section className="peerbar" aria-label={t("chat.dispatch_threads_title")}>
      <div className="peerhead">{t("chat.dispatch_threads_title")} · {t("chat.dispatch_threads_count", { n: threads.length })}</div>
      {threads.map((th) => {
        const name = th.role || th.title;
        const state = wording(th, name);
        const go = () => { if (th.sessionPath) onOpen?.(th.sessionPath); };
        return (
          <div className="peerrow" key={th.key}>
            <span className="peerhead">{t("chat.dispatch_thread_handling", { title: name })}</span>
            <span className="peerhead">{state}</span>
            {th.sessionPath && (
              <span className="acts">
                <button type="button" className="peerthread" data-state={th.state} data-action="peer.thread-open"
                  data-session-path={th.sessionPath} title={state} aria-label={state} onClick={go}>
                  <i className="peerthread-lamp" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
