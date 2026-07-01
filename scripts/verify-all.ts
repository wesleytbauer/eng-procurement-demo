// Aggregate offline gate for the engineering-procurement layer. Runs every domain's
// Solution Eval in-process and fails if any one fails. This is the single command
// that says the whole doctrine layer is honoured by its implementation.
//
//   npx tsx scripts/verify-all.ts   (or: npm run verify)

import { pathToFileURL } from "node:url";
import { selftest as standard } from "./standard.selftest.js";
import { selftest as catalog } from "./catalog.selftest.js";
import { selftest as supplier } from "./supplier.selftest.js";
import { selftest as operations } from "./operations.selftest.js";
import { selftest as demo } from "../demo/demo.selftest.js";

const domains: Array<[string, () => number]> = [
  ["Product Standard (STD)", standard],
  ["Vendor Catalog (CAT)", catalog],
  ["Supplier Truth (SUP)", supplier],
  ["Procurement Operations (OPS)", operations],
  ["Synthetic demo (end-to-end)", demo],
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
