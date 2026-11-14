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
    const header = page.locator(".projects-header");
    const label = page.locator(".projects-header .vtab");
    const filter = page.locator(".projects-header .session-filter-trigger");
    // The heading is a label now: it names the column and owns no controls
    // beyond the session filter (fa9e491). Folding a whole group lives on the
    // tree's own group heads, the projects head (项目 ⌄) being that run's fold-all.
    const fold = page.locator('.rail [data-action="workspace.fold-all"][data-value="projects"]');
    await header.waitFor();
    check(`${scheme}: the 任务列表 header is a label marked current`,
      (await label.getAttribute("aria-current")) === "true");
    check(`${scheme}: the heading carries no add-folder control`,
      await page.locator('.projects-header [data-action="workspace.add"]').count() === 0);
    check(`${scheme}: the retired recent header entry is gone`,
      await page.locator('.projects-header [data-action="session.recent"]').count() === 0);
    await fold.waitFor();
    check(`${scheme}: the projects group head is the run's fold-all`,
      (await fold.getAttribute("aria-label")) === "收起所有项目" && (await fold.getAttribute("aria-expanded")) === "true");
    // The head folds the local run; SSH rows keep their own folds.
    const localKids = page.locator(".rail .wsnode:not(:has(.rmtwsrow)) .kids");
    const remoteRow = page.locator(".rail .wsrow.rmtwsrow[aria-expanded]").first();
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
    // The retired 最近 page orders the same list the filter scopes narrow, as a
    // row inside the filter menu rather than a header entry.
    await filter.click();
    const filterMenu = page.locator(".session-filter-menu");
    await filterMenu.waitFor();
    const recentRow = filterMenu.locator('[data-action="session.filter"][data-value="recent"]');
    check(`${scheme}: the filter menu offers 最近 beside the scopes it reorders`, await recentRow.isVisible());
    // One row cycles newest → oldest → off, ending where it started so the
    // long-list section below reads the resting order.
    for (const arrow of ["↑", "↓", "⇅"]) {
      await recentRow.click();
      // The arrow rides the row text itself, no .rt slot of its own any more.
      const shown = (await recentRow.textContent())?.replace("最近", "").trim();
      check(`${scheme}: picking 最近 cycles the order to ${arrow} and keeps the menu open`,
        shown === arrow && await filterMenu.isVisible(), shown);
    }
    await page.keyboard.press("Escape");
    // Closing sets the hidden attribute; the element stays in the DOM, so the
    // wait is on the attribute, not on Playwright's visibility.
    await page.waitForFunction(() => document.querySelector(".session-filter-menu")?.hasAttribute("hidden"), null, { timeout: 8000 });
    check(`${scheme}: closing the filter returns focus to its own header entry`,
      await filter.evaluate((button) => button === document.activeElement));
    // A long project list scrolls under the header without dragging it away.
    await page.goto(`${BASE}?pref=zh&ws=20&sess=8&turns=3`, { waitUntil: "networkidle" });
    const tree = page.getByRole("tree", { name: "项目与会话", exact: true });
    const rows = tree.getByRole("treeitem");
    await rows.first().waitFor();
    await header.waitFor();
    const filterTop = await filter.evaluate((button) => button.getBoundingClientRect().top);
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
    const filterAtEnd = await filter.evaluate((button) => {
      const r = button.getBoundingClientRect();
      return { top: r.top, reached: button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) };
    });
    check(`${scheme}: the header stays fixed and its filter stays clickable while the tree scrolls`,
      filterAtEnd.top === filterTop && filterAtEnd.reached, JSON.stringify(filterAtEnd));
    await page.keyboard.press("Home");
    check(`${scheme}: Home returns to the first project`,
      await rows.first().evaluate((row) => row === document.activeElement));
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], "project header interaction regressions");
