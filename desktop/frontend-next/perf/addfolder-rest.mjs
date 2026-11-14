// The add-folder entry moved off the Projects heading (fa9e491): the heading
// is a label, and the folder answer lives in the fresh conversation's pill
// palette. Opacity and hit-testing need a real browser.
import { chromium } from "playwright";

const BASE = process.env.PERF_URL ?? "http://localhost:4399/perf.html?pref=zh";
const fails = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  ok" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) fails.push(name);
};

const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"]) {
    for (const width of [1280, 1600]) {
      const where = `${theme} ${width}`;
      const page = await browser.newPage({ viewport: { width, height: 800 }, colorScheme: theme, reducedMotion: "reduce" });
      page.on("pageerror", (e) => fails.push("page error: " + e.message));
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".projects-header");
      await page.mouse.move(width - 2, 790);
      await page.waitForTimeout(300);

      // The heading keeps quiet: it names the column below, it is not a control.
      const quiet = await page.evaluate(() => {
        const row = document.querySelector(".projects-header");
        return {
          add: row?.querySelector('[data-action="workspace.add"]') ?? null,
          label: row?.querySelector(".vtab")?.getAttribute("aria-current") ?? null,
        };
      });
      check(`${where}: the Projects heading carries no add-folder button`, quiet.add === null);
      check(`${where}: the 任务列表 header is a label marked current`, quiet.label === "true");

      // A fresh conversation carries the pill; its palette holds the folder
      // entries, visible and hit-testable without any hover reveal.
      await page.locator('[data-action="session.new"]').first().click();
      // Only the fresh pane's pill is visible; the background panes keep their
      // own (hidden) project triggers in the DOM.
      const pill = page.locator('[data-action="workspace.configure"][title^="会话所属项目"]:visible').first();
      await pill.waitFor();
      await pill.click();
      await page.locator('[data-action="workspace.add-menu"]').waitFor();
      await page.locator('[data-action="workspace.add-menu"]').click();
      const blank = page.locator('[data-action="workspace.add-blank"]');
      const existing = page.locator('[data-action="workspace.add-existing"]');
      await blank.waitFor();
      const geo = await blank.evaluate((button) => {
        const r = button.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        let seen = 1;
        for (let el = button; el && el !== document.body; el = el.parentElement) seen *= Number(getComputedStyle(el).opacity);
        return { opacity: seen, width: r.width, height: r.height, hits: hit === button || button.contains(hit) };
      });
      check(`${where}: the palette offers the folder entries`, geo.width > 0 && geo.height > 0 && (await existing.isVisible()), JSON.stringify(geo));
      check(`${where}: they are visible without hovering`, geo.opacity === 1);
      check(`${where}: the blank-project entry takes the pointer`, geo.hits);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (fails.length) {
  console.log(`\n${fails.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
