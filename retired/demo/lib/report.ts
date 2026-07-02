// PART 3 — report + diagram builders. Markdown pipe-tables (the parent OS convention)
// plus GitHub-native Mermaid (flowchart / stateDiagram / sequenceDiagram — the three
// reliably-rendered kinds; no chart libs, no SVG). Everything here is pure string
// building so artifacts are byte-stable.

import type { CoverageReport, StandardChangeDiff } from "../../lib/catalog.js";
import type { Scorecard } from "./award.js";
import type { Event, SlotRun } from "./timeline.js";

export const f2 = (x: number) => x.toFixed(2);

export function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "_none_\n";
  const h = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${h}\n${sep}\n${body}\n`;
}

export function renderCoverage(cov: Map<string, CoverageReport>): string {
  const rows = [...cov.entries()].map(([slot, r]) => [
    slot,
    r.ok ? "✓ covered" : "✗",
    String(r.gaps.length),
    String(r.nonconforming.length),
    String(r.unsourced.length),
    String(r.unjustifiedAlternates.length),
  ]);
  return table(["slot", "status", "gaps", "non-conforming", "unsourced", "unjustified-alt"], rows);
}

export function renderRejections(rows: Array<{ id: string; rule: string; got: string; ok: boolean }>): string {
  return table(
    ["submission", "rejected by", "detected", "as expected"],
    rows.map((r) => [r.id, r.rule, r.got, r.ok ? "✓" : "✗"]),
  );
}

export function renderResolution(
  rows: Array<{ ref: string; id: string }>,
  partitionEqual: boolean,
): string {
  const t = table(["incoming reference", "resolved identity"], rows.map((r) => [r.ref, r.id]));
  return `${t}\nLocal master vs external system-of-record induce the **same partition** over these references: **${partitionEqual ? "✓ identical" : "✗ DIFFERENT"}** — the consumer contract is store-agnostic (SUP-R-01/-R-05).\n`;
}

export function renderScorecard(s: Scorecard, nameOf: (id: string) => string): string {
  const rows = s.lines.map((l) => [
    l.eligible ? String(l.rank) : "—",
    l.entryId,
    nameOf(l.supplierId),
    `$${f2(l.rawPrice)}`,
    `${l.rawLead}d`,
    l.eligible ? f2(l.normRisk) : "—",
    l.eligible ? f2(l.rawPerf) : "—",
    l.eligible ? f2(l.total) : "—",
    l === s.winner ? "🏆 AWARD" : l.eligible ? "eligible" : `ineligible — ${l.ineligibleReason}`,
  ]);
  const weights = s.criteria.map((c) => `${c.key} ${c.weight}`).join(" · ");
  return `**${s.slotKey}** (order ${s.orderQty}; weights: ${weights})\n\n${table(
    ["rank", "entry", "supplier", "price", "lead", "risk", "perf", "score", "outcome"],
    rows,
  )}`;
}

export function renderReconcile(
  diffs: Map<string, StandardChangeDiff>,
  posAtRisk: Array<{ slot: string; entryId: string; supplier: string }>,
  reawards: Array<{ slot: string; outcome: string }>,
): string {
  const flips: string[][] = [];
  let newGaps: string[] = [];
  for (const [slot, d] of diffs) {
    for (const id of d.newlyInvalid) flips.push([slot, id]);
    newGaps = newGaps.concat(d.newGaps);
  }
  const out: string[] = [];
  out.push(`**Newly non-conformant catalog entries (${flips.length}):**\n`);
  out.push(table(["slot", "entry"], flips));
  out.push(`\n**New sourcing gaps (${newGaps.length}):** ${newGaps.length ? newGaps.join(", ") : "_none_"}\n`);
  out.push(`\n**In-flight POs at risk (${posAtRisk.length}):**\n`);
  out.push(table(["slot", "awarded entry", "supplier"], posAtRisk.map((p) => [p.slot, p.entryId, p.supplier])));
  out.push(`\n**Automatic re-award of affected slots:**\n`);
  out.push(table(["slot", "outcome"], reawards.map((r) => [r.slot, r.outcome])));
  return out.join("\n");
}

export function renderTimeline(events: Event[]): string {
  return table(
    ["#", "slot", "event", "detail"],
    events.map((e) => [String(e.seq), e.slot, e.kind, e.detail]),
  );
}

export function renderRuns(runs: Map<string, SlotRun>, nameOf: (id: string) => string): string {
  const rows = [...runs.values()].map((r) => [
    r.slot,
    nameOf(r.supplierId),
    `${r.receivedQty}/${r.orderedQty}`,
    `${r.leadTimeDays}d${r.slipped ? " (slipped)" : ""}`,
    r.shortage ? "shortage" : r.ncr ? "NCR" : "ok",
    r.paid ? "paid" : `unpaid${r.paymentBlocked ? " (flagged)" : ""}`,
    r.line.state,
  ]);
  return table(["slot", "supplier", "received", "lead", "quality", "payment", "final state"], rows);
}

// ---- Mermaid (GitHub-native) ----

export function mermaidFlow(): string {
  return [
    "```mermaid",
    "flowchart LR",
    "  PL[Product line] -->|invariants + variables| STD[Standard - derived]",
    "  STD -->|conformance gate| CAT[Vendor catalog]",
    "  SUP[Supplier truth - identity] --> CAT",
    "  CAT -->|catalog-sourced demand| OPS[Procurement ops]",
    "  SUP -->|award + performance by identity| OPS",
    "  OPS -->|delivery performance| SUP",
    "  STD -.->|v1 to v2 change| CAT",
    "```",
  ].join("\n");
}

export function mermaidLifecycle(): string {
  return [
    "```mermaid",
    "stateDiagram-v2",
    "  [*] --> demand",
    "  demand --> quoted",
    "  quoted --> ordered: PO staged, approved, executed",
    "  ordered --> received: lead time disseminated",
    "  received --> invoiced: three-way match",
    "  invoiced --> closed: paid, no open exceptions",
    "  invoiced --> invoiced: payment flagged / exception open",
    "  closed --> [*]",
    "```",
  ].join("\n");
}

export function mermaidAward(): string {
  return [
    "```mermaid",
    "flowchart TD",
    "  Q[Quotes for slot] --> G{Eligible?<br/>conformant + sourced + qty ≥ MOQ}",
    "  G -->|no| X[Ineligible<br/>shown with reason]",
    "  G -->|yes| N[Normalize price / lead / risk / performance]",
    "  N --> W[Weighted score 0.40 / 0.25 / 0.15 / 0.20]",
    "  W --> R[Rank → auditable scorecard]",
    "  R --> A[Award = rank 1]",
    "```",
  ].join("\n");
}

export function mermaidSequence(events: Event[], slot: string): string {
  const lines = ["```mermaid", "sequenceDiagram", "  participant E as Engineering", "  participant P as Procurement", "  participant S as Supplier"];
  for (const e of events.filter((x) => x.slot === slot)) {
    const msg = `${e.kind}: ${e.detail}`.replace(/[\n\r]/g, " ").slice(0, 70);
    if (["demand", "po-staged", "po-issued", "disseminate"].includes(e.kind)) lines.push(`  P->>S: ${msg}`);
    else if (["receipt", "shortage", "ncr", "lead-slip"].includes(e.kind)) lines.push(`  S->>P: ${msg}`);
    else if (e.kind === "perf") lines.push(`  P->>P: ${msg}`);
    else lines.push(`  Note over P,S: ${msg}`);
  }
  lines.push("```");
  return lines.join("\n");
}
