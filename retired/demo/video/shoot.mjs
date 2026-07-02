// Verification screenshots: node shoot.mjs <sceneIndex> [sceneIndex...]
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(dir, "out");
mkdirSync(outDir, { recursive: true });
const size = { width: 1920, height: 1080 };
const indices = process.argv.slice(2).map(Number);

const browser = await chromium.launch({ args: ["--no-sandbox", "--force-color-profile=srgb"] });
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const i of indices) {
  await page.goto("file://" + join(dir, "explainer.html") + "?s=" + i + "#still=" + i);
  await page.waitForTimeout(900);
  const f = join(outDir, `scene-${i}.png`);
  await page.screenshot({ path: f });
  console.log("wrote", f);
}
await browser.close();
