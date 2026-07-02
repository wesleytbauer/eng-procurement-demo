// PART 2/3 — the end-to-end orchestrator. `npm run demo` runs the whole pipeline over
// the synthetic world and writes byte-stable artifacts to demo/out/ plus the generated
// presentation/STORY.md. runScenario() is shared with demo.selftest.ts so the gate
// asserts exactly what the artifacts show.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { conform } from "../lib/standard.js";
import { checkCoverage, reconcileToStandard, type CoverageReport, type StandardChangeDiff } from "../lib/catalog.js";
import { partition, partitionsEqual } from "../lib/supplier.js";
import { REQUIRED_KEYS } from "./data/product.js";
import { RESOLUTION_REFS } from "./data/suppliers.js";
import { orderQtyForSlot, QUARTER, UNITS } from "./data/schedule.js";
import { buildWorld, entriesForSlot, type World } from "./lib/world.js";
import { scoreSlot, type AwardLine, type Scorecard } from "./lib/award.js";
import { runTimeline, type TimelineResult } from "./lib/timeline.js";
import * as R from "./lib/report.js";

export interface RejectionRow { id: string; rule: string; got: string; ok: boolean }
export interface ScenarioResult {
  world: World;
  nameOf: (id: string) => string;
  coverage: Map<string, CoverageReport>;
  coverageGreen: boolean;
  rejections: RejectionRow[];
  resolution: { rows: Array<{ ref: string; id: string }>; partitionEqual: boolean; acmeOneId: boolean };
  scorecardsV1: Map<string, Scorecard>;
  winnersV1: Map<string, AwardLine>;
  closedLoop: { withPerf?: string; withoutPerf?: string; changed: boolean };
  timeline: TimelineResult;
  diffs: Map<string, StandardChangeDiff>;
  posAtRisk: Array<{ slot: string; entryId: string; supplier: string }>;
  reawards: Array<{ slot: string; outcome: string; winnerEntryId?: string; gap: boolean }>;
  totals: { newlyInvalid: number; newGaps: number; posAtRisk: number };
}

export function runScenario(seed: number): ScenarioResult {
  const world = buildWorld(seed);
  const nameOf = (id: string) => world.registry.get(id)?.canonicalName ?? id;

  // 1. Coverage per slot (v1).
  const coverage = new Map<string, CoverageReport>();
  for (const slot of REQUIRED_KEYS) {
    const s = world.slotsV1.get(slot)!;
    coverage.set(slot, checkCoverage(s.line, s.std, [slot], entriesForSlot(world, slot)));
  }
  const coverageGreen = [...coverage.values()].every((r) => r.ok);

  // 2. Rejected submissions — one per CAT failure mode.
  const rejections: RejectionRow[] = world.rejected.map(({ entry, expect, rule }) => {
    const slotKey = entry.componentKey;
    const known = REQUIRED_KEYS.includes(slotKey);
    const sourcedOk = !!entry.source?.trim() && !!entry.supplierId?.trim();
    const s = known ? world.slotsV1.get(slotKey)! : undefined;
    const conf = s ? conform(s.line, s.std, entry.component).ok : false;
    let got: string;
    if (!known) got = "out-of-standard";
    else if (!sourcedOk) got = "unsourced";
    else if (!conf) got = "nonconforming";
    else {
      const rep = checkCoverage(s!.line, s!.std, [slotKey], [...entriesForSlot(world, slotKey), entry]);
      got = rep.unjustifiedAlternates.includes(entry.id) ? "unjustified-alternate" : "accepted";
    }
    return { id: entry.id, rule, got, ok: got === expect };
  });

  // 3. Supplier identity resolution + local↔SoR partition equality.
  const acmeIds = new Set(RESOLUTION_REFS.slice(0, 3).map((r) => world.registry.resolve(r)));
  const resolution = {
    rows: RESOLUTION_REFS.map((r) => ({ ref: `${r.name}${r.taxId ? ` / ${r.taxId}` : ""}${r.feed ? ` (${r.feed})` : ""}`, id: world.registry.resolve(r) })),
    partitionEqual: partitionsEqual(partition(world.registry, RESOLUTION_REFS), partition(world.sor, RESOLUTION_REFS)),
    acmeOneId: acmeIds.size === 1,
  };

  // 4. Awards (v1) — on the seeded performance, before any deliveries.
  const scorecardsV1 = new Map<string, Scorecard>();
  const winnersV1 = new Map<string, AwardLine>();
  for (const slot of REQUIRED_KEYS) {
    const s = world.slotsV1.get(slot)!;
    const card = scoreSlot(s, entriesForSlot(world, slot), world.quotes, world.registry, world.perf, orderQtyForSlot(slot));
    scorecardsV1.set(slot, card);
    if (card.winner) winnersV1.set(slot, card.winner);
  }

  // 5. Closed-loop proof (computed before the timeline mutates performance): the
  //    gearbox award flips when performance history is included vs ignored.
  const gb = world.slotsV1.get("gearbox")!;
  const gbEntries = entriesForSlot(world, "gearbox");
  const withPerf = scoreSlot(gb, gbEntries, world.quotes, world.registry, world.perf, orderQtyForSlot("gearbox")).winner?.entryId;
  const withoutPerf = scoreSlot(gb, gbEntries, world.quotes, world.registry, new Map(), orderQtyForSlot("gearbox")).winner?.entryId;
  const closedLoop = { withPerf, withoutPerf, changed: withPerf !== withoutPerf };

  // 6. Run the procure-to-pay timeline (records deliveries back into world.perf).
  const timeline = runTimeline(world, winnersV1);

  // 7. v1→v2 standard change — reconcile each slot.
  const diffs = new Map<string, StandardChangeDiff>();
  for (const slot of REQUIRED_KEYS) {
    const v1 = world.slotsV1.get(slot)!;
    const v2 = world.slotsV2.get(slot)!;
    diffs.set(slot, reconcileToStandard(v1.line, v1.std, v2.line, v2.std, [slot], [slot], entriesForSlot(world, slot)));
  }

  // 8. POs at risk: an awarded entry that is now non-conformant under v2.
  const posAtRisk: Array<{ slot: string; entryId: string; supplier: string }> = [];
  for (const run of timeline.runs.values()) {
    const v2 = world.slotsV2.get(run.slot)!;
    const entry = world.accepted.find((e) => e.id === run.awardEntryId)!;
    if (!conform(v2.line, v2.std, entry.component).ok) {
      posAtRisk.push({ slot: run.slot, entryId: run.awardEntryId, supplier: nameOf(run.supplierId) });
    }
  }

  // 9. Re-award affected slots under v2 (using post-delivery performance).
  const reawards: Array<{ slot: string; outcome: string; winnerEntryId?: string; gap: boolean }> = [];
  for (const slot of REQUIRED_KEYS) {
    const d = diffs.get(slot)!;
    if (d.newlyInvalid.length === 0 && d.newGaps.length === 0) continue;
    const v2 = world.slotsV2.get(slot)!;
    const card = scoreSlot(v2, entriesForSlot(world, slot), world.quotes, world.registry, world.perf, orderQtyForSlot(slot));
    if (card.winner) reawards.push({ slot, outcome: `re-awarded to ${card.winner.entryId} (${nameOf(card.winner.supplierId)})`, winnerEntryId: card.winner.entryId, gap: false });
    else reawards.push({ slot, outcome: "GAP — no eligible supplier, re-source required", gap: true });
  }

  const newlyInvalid = [...diffs.values()].reduce((s, d) => s + d.newlyInvalid.length, 0);
  const newGaps = [...diffs.values()].reduce((s, d) => s + d.newGaps.length, 0);

  return {
    world, nameOf, coverage, coverageGreen, rejections, resolution, scorecardsV1, winnersV1,
    closedLoop, timeline, diffs, posAtRisk, reawards,
    totals: { newlyInvalid, newGaps, posAtRisk: posAtRisk.length },
  };
}

// ---- artifact rendering ----

function buildStory(r: ScenarioResult): string {
  const winnerLine = (slot: string) => {
    const w = r.winnersV1.get(slot);
    return w ? `${slot} → **${w.entryId}** (${r.nameOf(w.supplierId)})` : `${slot} → _no award_`;
  };
  return [
    `# Cyberdyne GM-Series — engineering→procurement, end to end`,
    ``,
    `A fully synthetic, fully deterministic run of the eng-procurement framework: a`,
    `7-slot sealed DC gearmotor, built ${UNITS} units over ${QUARTER}. Everything below is`,
    `generated by \`npm run demo\` from the code — the tables are the program's output.`,
    ``,
    `> **Advisory boundary.** This demo simulates the *whole* procure-to-pay world`,
    `> end to end so the framework is tangible. In production the lifecycle acts it`,
    `> shows — issuing POs, receiving invoices, paying — belong to the company's`,
    `> **system of record**; the tool ingests those read-only and **recommends**`,
    `> actions. The tool recommends, never acts; mirrors, never masters; and is never`,
    `> the source of truth (see \`constitutions/procurement-operations.md\`).`,
    ``,
    `## 1. The pipeline`,
    ``,
    R.mermaidFlow(),
    ``,
    `## 2. The standard covers its catalog (both directions)`,
    ``,
    `Seven slots, each its own derived standard. Coverage is green: every required slot`,
    `has a conformant, sourced source; nothing sits outside the standard.`,
    ``,
    R.renderCoverage(r.coverage),
    ``,
    `The gate also turns submissions away — one per failure mode:`,
    ``,
    R.renderRejections(r.rejections),
    ``,
    `## 3. One company, three names → one identity`,
    ``,
    `The supplier master resolves every spelling/feed of a vendor to a single identity,`,
    `and an external system-of-record produces the identical partition.`,
    ``,
    R.renderResolution(r.resolution.rows, r.resolution.partitionEqual),
    ``,
    `## 4. Who wins each PO — and why`,
    ``,
    R.mermaidAward(),
    ``,
    [...r.scorecardsV1.values()].map((s) => R.renderScorecard(s, r.nameOf)).join("\n"),
    ``,
    `Awards: ${REQUIRED_KEYS.map(winnerLine).join("; ")}.`,
    ``,
    `**Closed loop:** with performance history the gearbox award is`,
    `**${r.closedLoop.withPerf}**, but ignoring performance it would be`,
    `**${r.closedLoop.withoutPerf}** — recorded delivery behavior changes the decision.`,
    ``,
    `## 5. The quarter runs`,
    ``,
    R.mermaidLifecycle(),
    ``,
    R.renderRuns(r.timeline.runs, r.nameOf),
    ``,
    `Motor lifecycle in detail:`,
    ``,
    R.mermaidSequence(r.timeline.events, "motor"),
    ``,
    `## 6. Engineering changes the standard — watch what breaks`,
    ``,
    `Two edits: raise the ingress floor (ip54 → ip65) on motor + housing, and drop 12V`,
    `on motor + controller. The system names **exactly** what to re-source and which`,
    `in-flight POs are now at risk.`,
    ``,
    R.renderReconcile(r.diffs, r.posAtRisk, r.reawards),
    ``,
    `**Headline:** ${r.totals.newlyInvalid} entries newly non-conformant, ${r.totals.newGaps} new`,
    `sourcing gap, ${r.totals.posAtRisk} POs at risk — computed, not estimated.`,
    ``,
  ].join("\n");
}

function writeArtifacts(r: ScenarioResult, demoDir: string): string[] {
  const outDir = join(demoDir, "out");
  const presDir = join(demoDir, "..", "presentation");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(presDir, { recursive: true });

  const scorecards = [...r.scorecardsV1.values()].map((s) => R.renderScorecard(s, r.nameOf)).join("\n");
  const files: Array<[string, string]> = [
    [join(outDir, "coverage.md"), `# Catalog coverage (v1)\n\n${R.renderCoverage(r.coverage)}\n## Rejected submissions\n\n${R.renderRejections(r.rejections)}`],
    [join(outDir, "suppliers.md"), `# Supplier identity\n\n${R.renderResolution(r.resolution.rows, r.resolution.partitionEqual)}`],
    [join(outDir, "scorecards.md"), `# Award scorecards (v1)\n\n${R.mermaidAward()}\n\n${scorecards}`],
    [join(outDir, "timeline.md"), `# Procure-to-pay timeline\n\n${R.renderRuns(r.timeline.runs, r.nameOf)}\n\n## Event log\n\n${R.renderTimeline(r.timeline.events)}\n\n## Motor sequence\n\n${R.mermaidSequence(r.timeline.events, "motor")}`],
    [join(outDir, "reconcile.md"), `# v1 → v2 standard change\n\n${R.renderReconcile(r.diffs, r.posAtRisk, r.reawards)}`],
    [join(outDir, "diagrams.md"), `# Diagrams\n\n## Pipeline\n\n${R.mermaidFlow()}\n\n## Lifecycle\n\n${R.mermaidLifecycle()}\n\n## Award decision\n\n${R.mermaidAward()}`],
    [join(outDir, "state.json"), JSON.stringify(stateDump(r), null, 2) + "\n"],
    [join(presDir, "STORY.md"), buildStory(r)],
  ];
  for (const [path, content] of files) writeFileSync(path, content, "utf8");
  return files.map(([p]) => p);
}

function stateDump(r: ScenarioResult) {
  return {
    quarter: QUARTER,
    units: UNITS,
    coverageGreen: r.coverageGreen,
    awardsV1: Object.fromEntries([...r.winnersV1].map(([slot, w]) => [slot, { entry: w.entryId, supplier: r.nameOf(w.supplierId), score: Number(w.total.toFixed(4)) }])),
    closedLoop: r.closedLoop,
    runs: Object.fromEntries([...r.timeline.runs].map(([slot, run]) => [slot, { supplier: r.nameOf(run.supplierId), received: `${run.receivedQty}/${run.orderedQty}`, state: run.line.state, paid: run.paid }])),
    v2: { newlyInvalid: r.totals.newlyInvalid, newGaps: r.totals.newGaps, posAtRisk: r.posAtRisk, reawards: r.reawards },
  };
}

function main(): number {
  const demoDir = dirname(fileURLToPath(import.meta.url));
  const r = runScenario(0xc0ffee);
  const written = writeArtifacts(r, demoDir);
  const out = process.stdout;
  out.write(`\nCyberdyne GM-Series — ${UNITS} units, ${QUARTER}\n`);
  out.write(`  ${r.coverageGreen ? "✓" : "✗"} catalog coverage green across ${r.coverage.size} slots\n`);
  out.write(`  ${r.resolution.acmeOneId ? "✓" : "✗"} 3 Acme references → 1 identity; ${r.resolution.partitionEqual ? "✓" : "✗"} local==SoR partition\n`);
  out.write(`  ✓ awards: ${[...r.winnersV1].map(([s, w]) => `${s}:${r.nameOf(w.supplierId)}`).join(", ")}\n`);
  out.write(`  ${r.closedLoop.changed ? "✓" : "✗"} closed loop: gearbox ${r.closedLoop.withoutPerf}→${r.closedLoop.withPerf} once performance counts\n`);
  out.write(`  ⚑ v1→v2: ${r.totals.newlyInvalid} entries invalid, ${r.totals.newGaps} gap, ${r.totals.posAtRisk} POs at risk\n`);
  out.write(`\nWrote ${written.length} artifacts to demo/out/ and presentation/STORY.md\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main());
}
