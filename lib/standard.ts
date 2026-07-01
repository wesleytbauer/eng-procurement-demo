// Product Standard (STD) — the head of the flow.
//
// A product line is modelled as an explicit separation of INVARIANTS (what never
// changes — predicates every conformant component must satisfy) from VARIABLES
// (what surrounds them — the free attributes and their allowed domains). The
// STANDARD is *derived* from that pair, never hand-authored, and decides
// conformance deterministically. Change an invariant or a variable and the
// derived standard — and therefore every downstream classification — changes.
//
// Implements: STD-R-01 (derived), STD-R-02 (separation), STD-R-03 (algorithmic
// conformance), STD-R-04 (total propagation + lineage), STD-R-05 (one scoped
// standard per line).

export interface Component {
  line: string;
  attrs: Record<string, string | number>;
}

export interface Invariant {
  key: string;
  /** What must ALWAYS hold for a conformant component. Approach-free predicate. */
  required: (c: Component) => boolean;
}

export interface Variable {
  key: string; // the attribute this variable governs
  domain: Array<string | number>; // the allowed values (the "surround")
}

export interface ProductLine {
  id: string;
  invariants: Invariant[];
  variables: Variable[];
}

export interface Standard {
  lineId: string;
  invariantKeys: string[];
  variables: Variable[];
  /** Lineage: a fingerprint of the (invariants, variables) the standard was
   *  derived from. A change to either yields a different fingerprint, so a stale
   *  standard is detectable (STD-R-04). */
  fingerprint: string;
}

/** Build a product line, enforcing STD-R-02: nothing is both invariant and
 *  variable. An element that is sometimes fixed and sometimes free is mis-modelled
 *  and rejected until split. */
export function buildLine(id: string, invariants: Invariant[], variables: Variable[]): ProductLine {
  if (!id || !id.trim()) throw new Error("STD-R-05: a product line must have an explicit scope (id)");
  const iKeys = new Set(invariants.map((i) => i.key));
  const overlap = variables.map((v) => v.key).filter((k) => iKeys.has(k));
  if (overlap.length) {
    throw new Error(`STD-R-02: element(s) declared as both invariant and variable: ${overlap.join(", ")}`);
  }
  return { id, invariants, variables };
}

function fingerprint(line: ProductLine): string {
  // Deterministic, order-independent lineage of the inputs the standard derives from.
  const inv = [...line.invariants.map((i) => `I:${i.key}=${i.required.toString()}`)].sort();
  const vars = [...line.variables.map((v) => `V:${v.key}=[${[...v.domain].sort().join(",")}]`)].sort();
  return `${line.id}|${[...inv, ...vars].join("|")}`;
}

/** Derive the standard from the line. STD-R-01: the standard is a function of its
 *  inputs, never authored independently. */
export function deriveStandard(line: ProductLine): Standard {
  return {
    lineId: line.id,
    invariantKeys: line.invariants.map((i) => i.key),
    variables: line.variables,
    fingerprint: fingerprint(line),
  };
}

export interface Conformance {
  ok: boolean;
  reasons: string[]; // why it failed, empty when ok
}

/** STD-R-03: deterministic conformant / non-conformant decision for a candidate
 *  component, plus STD-R-05 scope enforcement. The standard closes over the line's
 *  invariant predicates via the line; we re-attach them here. */
export function conform(line: ProductLine, std: Standard, c: Component): Conformance {
  const reasons: string[] = [];
  if (c.line !== std.lineId) reasons.push(`out of scope: component.line=${c.line} ≠ standard.lineId=${std.lineId}`);
  for (const inv of line.invariants) {
    if (!inv.required(c)) reasons.push(`invariant violated: ${inv.key}`);
  }
  for (const v of std.variables) {
    const val = c.attrs[v.key];
    if (val === undefined) reasons.push(`variable unset: ${v.key}`);
    else if (!v.domain.includes(val)) reasons.push(`variable out of domain: ${v.key}=${val} ∉ {${v.domain.join(",")}}`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** True when two standards were derived from the same inputs. A `false` after an
 *  input edit is the signal that classifications must be recomputed (STD-R-04). */
export function sameStandard(a: Standard, b: Standard): boolean {
  return a.fingerprint === b.fingerprint;
}
