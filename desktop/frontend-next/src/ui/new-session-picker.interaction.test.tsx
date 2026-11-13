// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "./testkit";
import { App } from "./App";
import { MockHub } from "../port/mock_hub";

afterEach(cleanup);

// The second folder the fixture remembers. Picking it is what the session's
// root has to be; anything else opened first would be the picker guessing.
const SECOND = "~/projects/my-website";

// Every rootless 新建会话 goes through the picker now: nothing opens until a
// row answers, and the escape row is the one answer that names no folder —
// hub.open then hears a request with no root at all, which is the kernel's
// contract for its own auto workspace. The per-project 新建 in the tree is the
// one entry that bypasses the picker, because its row already names a project.
describe("the new-session project picker", () => {
  let hub: MockHub;
  let asked: (string | undefined)[];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    asked = [];
    hub = new MockHub();
    const open = hub.open.bind(hub);
    hub.open = async (req) => {
      asked.push(req.root);
      return open(req);
    };
    // Past onboarding: a window still asking for a key draws neither the rail
    // nor a panes area, and this is a claim about a window that is working.
    const build = hub.portFor.bind(hub);
    hub.portFor = (rt) => {
      const port = build(rt);
      port.providerSetup = async () => null;
      port.welcomeSeen = async () => true;
      return port;
    };
  });

  // The head button is the one 新建会话 with no folder of its own to belong to.
  async function openPicker(user: ReturnType<typeof userEvent.setup>) {
    render(<App hub={hub} />);
    await screen.findByRole("combobox", { name: "任务输入" });
    const head = document.querySelector(".studio-rail-head") as HTMLElement;
    await user.click(within(head).getByRole("button", { name: /新建会话/ }));
    return screen.findByRole("dialog", { name: "选择项目" });
  }

  it("asks which project before any session opens, and lists the remembered ones", async () => {
    const user = userEvent.setup();
    const picker = await openPicker(user);

    expect(asked).toEqual([]);
    expect(within(picker).getByRole("button", { name: /DeepSeek-Reasonix/ })).toBeTruthy();
    expect(within(picker).getByRole("button", { name: /my-website/ })).toBeTruthy();
  });

  it("opens a session in the project the picked row names", async () => {
    const user = userEvent.setup();
    const picker = await openPicker(user);

    await user.click(within(picker).getByRole("button", { name: /my-website/ }));
    await waitFor(() => expect(asked).toEqual([SECOND]));
    expect(screen.queryByRole("dialog", { name: "选择项目" })).toBeNull();
  });

  it("opens a session with no root at all from 不在项目中工作", async () => {
    const user = userEvent.setup();
    const picker = await openPicker(user);

    await user.click(within(picker).getByRole("button", { name: "不在项目中工作" }));
    await waitFor(() => expect(asked).toEqual([undefined]));
  });

  it("hands 创建项目 to the folder adder, and the session opens through it", async () => {
    const user = userEvent.setup();
    hub.pickFolder = async () => "/work/picked-project";
    const added = vi.spyOn(hub, "addWorkspace");
    const picker = await openPicker(user);

    await user.click(within(picker).getByRole("button", { name: "创建项目" }));
    await waitFor(() => expect(added).toHaveBeenCalledWith("/work/picked-project"));
    await waitFor(() => expect(asked).toEqual(["/work/picked-project"]));
  });

  it("does not open the picker for the per-project 新建 in the tree", async () => {
    const user = userEvent.setup();
    render(<App hub={hub} />);
    await screen.findByRole("combobox", { name: "任务输入" });

    await user.click(screen.getByRole("button", { name: "在 my-website 下新建会话" }));
    await waitFor(() => expect(asked).toEqual([SECOND]));
    expect(screen.queryByRole("dialog", { name: "选择项目" })).toBeNull();
  });
});
