// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "./testkit";
import { MockPort } from "../port/mock";
import type { PeerThread, PeerThreadState } from "../port/boundary";
import { DispatchThreadsBar } from "./DispatchThreadsBar";

afterEach(cleanup);

const thread = (state: PeerThreadState, over: Partial<PeerThread> = {}): PeerThread => ({
  key: "peer-1",
  title: "Docs session",
  role: "组员B · VR面板式",
  project: "site",
  sessionPath: "/sessions/docs.jsonl",
  state,
  since: "2026-10-16T10:00:00Z",
  messageId: "m1",
  ...over,
});

function portWith(threads: PeerThread[], enabled = true) {
  const port = new MockPort();
  vi.spyOn(port, "peers").mockResolvedValue({ enabled, peers: [], held: [], threads });
  return port;
}

function draw(port: MockPort, onOpen = vi.fn()) {
  const view = render(<DispatchThreadsBar port={port} onOpen={onOpen} />);
  return { onOpen, container: view.container };
}

describe("the dispatch status bar", () => {
  it.each<[PeerThreadState, RegExp]>([
    ["waiting", /等对方的用户批准/],
    ["working", /已放行/],
    ["replied", /回复了你/],
    ["declined", /拒绝了你/],
  ])("says %s of the session the task was dispatched to", async (state, words) => {
    draw(portWith([thread(state)]));
    expect(await screen.findByText(/处理『组员B · VR面板式』的回信/)).toBeTruthy();
    // The state copy is visible text beside the row, and the role the sender
    // opened the session under is the name shown, not the peer's own title.
    expect(screen.getByText(words)).toBeTruthy();
    expect(screen.queryByText(/Docs session/)).toBeNull();
  });

  it("falls back to the session's own title when no role was given", async () => {
    draw(portWith([thread("replied", { role: undefined })]));
    expect(await screen.findByText(/处理『Docs session』的回信/)).toBeTruthy();
    expect(screen.getByText(/回复了你/)).toBeTruthy();
  });

  it("opens the peer's session from the row, carrying the action and the path", async () => {
    const { onOpen } = draw(portWith([thread("replied")]));
    const open = await screen.findByRole("button", { name: /回复了你/ });
    expect(open.getAttribute("data-action")).toBe("peer.thread-open");
    expect(open.getAttribute("data-session-path")).toBe("/sessions/docs.jsonl");
    await userEvent.click(open);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("/sessions/docs.jsonl");
  });

  it("shows one row per dispatched session, each with its own path", async () => {
    draw(portWith([thread("waiting"), thread("replied", { key: "peer-2", role: "评审", sessionPath: "/sessions/review.jsonl" })]));
    expect(await screen.findByText(/处理『组员B · VR面板式』的回信/)).toBeTruthy();
    expect(screen.getByText(/处理『评审』的回信/)).toBeTruthy();
    const open = screen.getAllByRole("button");
    expect(open).toHaveLength(2);
    expect(open[1].getAttribute("data-session-path")).toBe("/sessions/review.jsonl");
    expect(screen.getByText(/已派发 2 个会话/)).toBeTruthy();
  });

  it("names the bar for the cross-chat it reports", async () => {
    draw(portWith([thread("waiting")]));
    expect(await screen.findByRole("region", { name: /会话互聊/ })).toBeTruthy();
  });

  it("draws nothing while the kernel lists no threads", async () => {
    const port = portWith([]);
    const { container } = draw(port);
    await waitFor(() => expect(port.peers).toHaveBeenCalled());
    expect(container.children).toHaveLength(0);
  });

  it("draws nothing while cross-chat is switched off, even with threads listed", async () => {
    const port = portWith([thread("replied")], false);
    const { container } = draw(port);
    await waitFor(() => expect(port.peers).toHaveBeenCalled());
    expect(container.children).toHaveLength(0);
  });
});
