// Aggregate offline gate for the engineering-procurement layer. Runs every domain's
// Solution Eval in-process and fails if any one fails. This is the single command
// that says the whole doctrine layer is honoured by its implementation.
//
//   npx tsx scripts/verify-all.ts   (or: npm run verify)

import { pathToFileURL } from "node:url";
import { selftest as sourcing } from "./sourcing.selftest.js";
import { selftest as standard } from "./standard.selftest.js";
import { selftest as catalog } from "./catalog.selftest.js";
import { selftest as partIdentity } from "./selection.selftest.js";
import { selftest as supplier } from "./supplier.selftest.js";
import { selftest as operations } from "./operations.selftest.js";

// The six domain gates, in flow order (SUP underneath). SRC's gate verifies the
// *deterministic* half of its trust model — the LLM proposer is the envisioned
// build, not gated here. OPS is the advisory rebuild (recommend-only), replacing
// the retired executing-OPS gate (see retired/).
const domains: Array<[string, () => number]> = [
  ["Standard Sourcing (SRC)", sourcing],
  ["Product Standard (STD)", standard],
  ["Vendor Catalog (CAT)", catalog],
  ["Part Identity (PID)", partIdentity],
  ["Supplier Truth (SUP)", supplier],
  ["Procurement Operations (OPS)", operations],
];

function main(): number {
  let failed = 0;
  for (const [name, run] of domains) {
    process.stdout.write(`\n=== ${name} ===\n`);
    if (run() !== 0) failed++;
  }
  process.stdout.write(
    failed === 0
      ? `\nALL GATES PASS — ${domains.length}/${domains.length} domains green.\n`
      : `\nGATES FAILED — ${failed}/${domains.length} domain(s) red.\n`,
  );
  return failed === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(main());
}
