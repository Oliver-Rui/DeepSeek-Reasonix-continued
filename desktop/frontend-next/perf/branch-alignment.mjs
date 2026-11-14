import { chromium } from "playwright";

const BASE = process.env.PERF_URL ?? "http://localhost:4399/perf.html";
const fails = [];
// The Git chip lives in the composer's tool row, beside the mode picker. The
// project pill above the card borrows the same classes for its look, so every
// lookup scopes to the tool row — the pill is a different row on purpose.
const CHIP = ".turntools .studio-branch";
const CARD = ".turntools .studio-branch-card";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  for (const locale of ["zh", "en"]) {
    for (const git of ["none", "repo"]) {
      await page.goto(`${BASE}?pref=${locale}&turns=2&git=${git}`, { waitUntil: "networkidle" });
      await page.waitForSelector(`${CHIP} .lb`);
      await page.evaluate(() => document.fonts.ready);
      for (const scale of [1, 1.35]) {
        await page.evaluate((value) => document.documentElement.style.setProperty("--fs-scale", String(value)), scale);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const geometry = await page.evaluate((chip) => {
          const label = document.querySelector(`${chip} .lb`).getBoundingClientRect();
          const peer = document.querySelector(".studio-mode-picker > span:not(.studio-sr-label)").getBoundingClientRect();
          return { top: label.top - peer.top, height: label.height - peer.height };
        }, CHIP);
        const name = `${locale}/${git}/text-scale=${scale}`;
        const aligned = Math.abs(geometry.top) <= 0.5 && Math.abs(geometry.height) <= 0.5;
        console.log(`${aligned ? "ok" : "FAIL"} ${name}: ${JSON.stringify(geometry)}`);
        if (!aligned) fails.push(name);
      }
      await page.focus(CHIP);
      // The card is the chip's sibling inside the pop, not its child.
      if (git === "none") await page.waitForSelector(`${CARD}[role="tooltip"]`, { state: "visible" });
      if (git === "repo") {
        await page.click(CHIP);
        await page.waitForSelector('.workspace-palette[role="dialog"]', { state: "visible" });
        await page.keyboard.press("Escape");
      }
    }
  }
} finally {
  await browser.close();
}
if (fails.length) {
  console.error(`Misaligned Git labels: ${fails.join(", ")}`);
  process.exit(1);
}
