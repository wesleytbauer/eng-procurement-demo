# Animated walkthrough (video)

`demo-walkthrough.mp4` (and `.webm`) — a ~77-second animated explainer of the whole
system, end to end. **Every number on screen is real output** from `npm run demo`
(awards, the closed-loop flip, and the v1→v2 break: 6 invalid / 1 gap / 2 POs at
risk). It is the moving-picture version of `STORY.md`.

Use it as the lead attachment for the LinkedIn / X posts in this folder.

## Scenes

1. Title — "a product's rules, wired straight into who you buy from"
2. The problem — two spreadsheets that never talk
3. The one idea — invariants (the law) vs variables (the freedom) → a derived standard
4. The pipeline — standard → catalog → procure-to-pay, with the performance loop
5. Supplier truth — one company, three names → one identity
6. The award scorecard — motor goes to Soylent (cheapest + fastest), fully explained
7. The quarter runs — lifecycle, a caught slip, a flagged invoice, the closed loop
8. **The moment** — engineering tightens two rules; 6 entries flip, 1 gap, 2 POs at
   risk; auto re-award; the cheapest supplier was the casualty
9. Closing — 5/5 gates green, computed not estimated, repo link

## How it's generated (offline, deterministic)

| Step | What |
|---|---|
| `demo/video/explainer.html` | Self-contained animated page (system fonts, no external assets). Numbers baked in from the demo run. |
| `demo/video/render.mjs` | Drives Chromium's **virtual clock** via CDP, captures one frame per virtual tick (load-independent — immune to CPU jitter), then muxes to mp4 (H.264) + webm (VP9) with ffmpeg. |
| `npm run video` | Runs the whole pipeline. |

Regenerating is deterministic: same HTML + same virtual clock → same frames.

**Requirements (not part of the offline gates):** a `playwright` install (Chromium)
and `ffmpeg` on PATH. These are only needed to *re-render* the video; the committed
mp4/webm need nothing. `demo/video/shoot.mjs` renders single still frames for
checking a scene's layout (`node shoot.mjs <sceneIndex>`).
