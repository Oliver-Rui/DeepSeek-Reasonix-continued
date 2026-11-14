// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "./testkit";
import { App } from "./App";
import { MockHub } from "../port/mock_hub";

afterEach(cleanup);

// Adding a project from the pill's palette: the folder goes to the same adder
// a sidebar drop uses, and the window answers by opening a session in it —
// nothing is sent to a model on the way.
describe("adding a project from the pill's palette", () => {
  it("selects it and opens a new session in it, without sending anything", async () => {
    const user = userEvent.setup();
    const hub = new MockHub();
    const build = hub.portFor.bind(hub);
    hub.portFor = (rt) => {
      const port = build(rt);
      port.providerSetup = async () => null;
      port.welcomeSeen = async () => true;
      port.workspaces = async () => ({ current: rt.root ?? "", canSwitch: true, canIsolate: true, recents: [] });
      return port;
    };
    hub.pickFolder = async () => "/work/fresh-project";
    const open = vi.spyOn(hub, "open");
    render(<App hub={hub} />);

    await screen.findByRole("combobox", { name: "任务输入" });
    await user.click(screen.getByRole("button", { name: "DeepSeek-Reasonix" }));
    const palette = await screen.findByRole("dialog", { name: "会话所属项目" });
    await user.click(within(palette).getByRole("button", { name: /添加新项目/ }));
    await user.click(within(palette).getByRole("button", { name: "使用现有文件夹" }));

    await waitFor(() => expect(open).toHaveBeenCalledWith({ root: "/work/fresh-project" }));
  });
});
