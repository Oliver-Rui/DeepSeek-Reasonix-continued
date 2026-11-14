import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.PERF_URL ?? "http://localhost:4399/perf.html";
const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  ok" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures.push(name);
};

const browser = await chromium.launch();
try {
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" });
    page.setDefaultTimeout(8000);
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(`${BASE}?pref=zh&turns=3`, { waitUntil: "networkidle" });
    const add = page.locator('.projects-header [data-action="workspace.add"]');
    const select = page.locator('.projects-header [data-action="session.selection"]');
    const filter = page.locator('.projects-header .session-filter-trigger');
    // Folding a whole group left the header toolbar: it lives on the tree's
    // own group heads now, the projects head (项目 ⌄) being that run's fold-all.
    const fold = page.locator('.rail [data-action="workspace.fold-all"][data-value="projects"]');
    await add.waitFor();
    await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
    const paint = (control) => control.evaluate((button) => {
      const style = getComputedStyle(button);
      return { fill: style.backgroundColor, ink: style.color };
    });
    await page.mouse.move(900, 500);
    const rest = await paint(add);
    await add.hover();
    const addHover = await paint(add);
    check(`${scheme}: the header icon actions visibly highlight on hover`,
      addHover.fill !== rest.fill && addHover.ink !== rest.ink);
    await page.mouse.move(900, 500);
    const selectRest = await paint(select);
    await select.hover();
    const selectHover = await paint(select);
    check(`${scheme}: project header icon actions have the same hover fill and ink`,
      selectHover.fill === addHover.fill && selectHover.ink === addHover.ink
        && selectHover.fill !== selectRest.fill,
      JSON.stringify({ add: addHover, select: selectHover }));
    await page.mouse.move(900, 500);
    const foldRest = await paint(fold);
    await fold.hover();
    const foldHover = await paint(fold);
    check(`${scheme}: the projects group head visibly highlights on hover`,
      foldHover.ink !== foldRest.ink, JSON.stringify({ head: { rest: foldRest, hover: foldHover } }));
    check(`${scheme}: the projects group head is the run's fold-all`,
      (await fold.getAttribute("aria-label")) === "收起所有项目" && (await fold.getAttribute("aria-expanded")) === "true");
    // The head folds the local run; SSH rows keep their own folds.
    const localKids = page.locator('.rail .wsnode:not(:has(.rmtwsrow)) .kids');
    const remoteRow = page.locator('.rail .wsrow.rmtwsrow[aria-expanded]').first();
    const localKidCount = await localKids.count();
    await fold.click();
    check(`${scheme}: the fold head collapses the local projects and leaves SSH rows to their own folds`,
      await fold.getAttribute("aria-expanded") === "false"
        && localKidCount > 0 && await localKids.count() === 0
        && await remoteRow.getAttribute("aria-expanded") === "true");
    await fold.click();
    check(`${scheme}: and expands them again`,
      await fold.getAttribute("aria-expanded") === "true"
        && await localKids.count() === localKidCount);
    await add.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const addFocus = await add.evaluate((button) => ({
      focused: button === document.activeElement,
      outline: getComputedStyle(button).outline,
    }));
    check(`${scheme}: the add action retains visible keyboard focus`,
      addFocus.focused && !addFocus.outline.includes("none"), JSON.stringify({ add: addFocus }));
    await add.click();
    const dialog = page.getByRole("dialog", { name: "打开项目", exact: true });
    await dialog.waitFor();
    check(`${scheme}: the add action still offers the local folder picker`,
      await dialog.getByRole("button", { name: "选择本机文件夹", exact: true }).isEnabled());
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.mouse.move(900, 500);
    const after = await paint(add);
    check(`${scheme}: closing the dialog restores the resting background`, after.fill === rest.fill);
    // The recent page is retired; 最近 now orders the same list the filter
    // scopes narrow, as a row inside the filter menu rather than a header entry.
    check(`${scheme}: the retired recent header entry is gone`,
      await page.locator('.projects-header [data-action="session.recent"]').count() === 0);
    await filter.click();
    const filterMenu = page.locator('.session-filter-menu');
    await filterMenu.waitFor();
    const recentRow = filterMenu.locator('[data-action="session.filter"][data-value="recent"]');
    check(`${scheme}: the filter menu offers 最近 beside the scopes it reorders`, await recentRow.isVisible());
    // One row cycles newest → oldest → off, ending where it started so the
    // long-list section below reads the resting order.
    for (const arrow of ["↑", "↓", "⇅"]) {
      await recentRow.click();
      const shown = (await recentRow.locator(".rt").textContent())?.trim();
      check(`${scheme}: picking 最近 cycles the order to ${arrow} and keeps the menu open`,
        shown === arrow && await filterMenu.isVisible(), shown);
    }
    await page.keyboard.press("Escape");
    await filterMenu.waitFor({ state: "hidden" });
    check(`${scheme}: closing the filter returns focus to its own header entry`,
      await filter.evaluate((button) => button === document.activeElement));
    await page.goto(`${BASE}?pref=zh&ws=20&sess=8&turns=3`, { waitUntil: "networkidle" });
    await add.waitFor();
    const headerTop = await add.evaluate((button) => button.getBoundingClientRect().top);
    const tree = page.getByRole("tree", { name: "项目与会话", exact: true });
    const rows = tree.getByRole("treeitem");
    await rows.first().focus();
    await page.keyboard.press("End");
    const last = rows.last();
    check(`${scheme}: End reaches the final local or remote row`,
      await last.evaluate((row) => row === document.activeElement));
    const bottom = await last.evaluate((row) => {
      const scroller = row.closest(".scroll");
      const r = row.getBoundingClientRect(), s = scroller.getBoundingClientRect();
      return { top: scroller.scrollTop, height: scroller.clientHeight, visible: r.top >= s.top && r.bottom <= s.bottom };
    });
    check(`${scheme}: a long project list scrolls to its final rows`, bottom.top > bottom.height && bottom.visible);
    const addAtEnd = await add.evaluate((button) => {
      const r = button.getBoundingClientRect();
      return { top: r.top, reached: button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) };
    });
    check(`${scheme}: project controls stay fixed and clickable while the tree scrolls`,
      addAtEnd.top === headerTop && addAtEnd.reached, JSON.stringify(addAtEnd));
    await page.keyboard.press("Home");
    check(`${scheme}: Home returns to the first project`,
      await rows.first().evaluate((row) => row === document.activeElement));
    await page.keyboard.press("Shift+F10");
    await page.getByRole("menu", { name: "项目操作", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await add.click();
    await dialog.waitFor();
    check(`${scheme}: the fixed add action retains local and remote project locations`,
      await dialog.getByRole("button", { name: "选择本机文件夹", exact: true }).isEnabled()
        && await dialog.getByRole("button", { name: "gpu-box · SSH", exact: true }).isEnabled());
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], "project header interaction regressions");
