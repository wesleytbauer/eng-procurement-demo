// Shared selftest assertion helper. Every domain's Solution Eval is a `selftest()`
// that builds a deterministic, offline scenario and asserts its named invariants
// through one of these checkers — same ✓/✗ shape as the parent OS's gates.

export interface Check {
  ok(name: string, cond: boolean, detail?: string): void;
  passed(): boolean;
  done(label: string): number; // prints the PASS/FAIL line, returns exit code
}

export function checker(): Check {
  let ok = true;
  return {
    ok(name, cond, detail = "") {
      process.stdout.write(`  ${cond ? "✓" : "✗"} ${name}${cond ? "" : `  — ${detail}`}\n`);
      if (!cond) ok = false;
    },
    passed: () => ok,
    done(label) {
      process.stdout.write(ok ? `\nselftest PASS — ${label}\n` : `\nselftest FAIL — ${label}\n`);
      return ok ? 0 : 1;
    },
  };
}
