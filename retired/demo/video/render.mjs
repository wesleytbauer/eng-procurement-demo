// Deterministic renderer: drives Chromium's VIRTUAL clock via CDP, captures one PNG
// per virtual frame (load-independent — immune to CPU contention / timer throttling),
// then muxes to mp4 (H.264) and webm (VP9) with ffmpeg.
//
//   node render.mjs            # full render
//   FPS=15 MAXFRAMES=45 node render.mjs   # short validation run
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const dir = dirname(fileURLToPath(import.meta.url));
const framesDir = join(dir, "out", "frames");
const presDir = join(dir, "..", "..", "presentation");
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const FPS = Number(process.env.FPS || 12);
const frameMs = 1000 / FPS;
const MAXFRAMES = Number(process.env.MAXFRAMES || Infinity);
const size = { width: 1920, height: 1080 };

const browser = await chromium.launch({
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars"],
});
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Page.enable");

await page.goto("file://" + join(dir, "explainer.html") + "?manual=1", { waitUntil: "load" });

// Freeze the virtual clock, then start the animation so nothing runs until we budget time.
await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
await page.evaluate(() => window.__start());

const totalMs = await page.evaluate(() => window.__TOTAL_MS__ || 78000);
const planned = Math.ceil(totalMs / frameMs) + 6; // small tail to hold the last frame
const nframes = Math.min(planned, MAXFRAMES);
console.log(`virtual total ${totalMs}ms · ${FPS}fps · ${nframes} frames`);

const advance = (budget) =>
  new Promise((res) => {
    cdp.once("Emulation.virtualTimeBudgetExpired", res);
    cdp.send("Emulation.setVirtualTimePolicy", { policy: "pauseIfNetworkFetchesPending", budget });
  });

for (let f = 0; f < nframes; f++) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
  writeFileSync(join(framesDir, `f-${String(f).padStart(5, "0")}.jpg`), Buffer.from(data, "base64"));
  if (f < nframes - 1) await advance(frameMs);
  if (f % 60 === 0) console.log(`  frame ${f}/${nframes}`);
}
await browser.close();
console.log("frames captured.");

if (Number.isFinite(MAXFRAMES)) {
  console.log("validation run — skipping mux.");
  process.exit(0);
}

const input = join(framesDir, "f-%05d.jpg");
const mp4 = join(presDir, "demo-walkthrough.mp4");
const webm = join(presDir, "demo-walkthrough.webm");
console.log("muxing mp4…");
execFileSync("ffmpeg", ["-y", "-framerate", String(FPS), "-i", input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" });
console.log("muxing webm…");
execFileSync("ffmpeg", ["-y", "-framerate", String(FPS), "-i", input, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "33", "-pix_fmt", "yuv420p", webm], { stdio: "inherit" });
console.log("done:", mp4, "+", webm);
