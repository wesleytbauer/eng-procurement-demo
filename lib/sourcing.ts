// Standard Sourcing (SRC) — the deterministic VERIFY layer of the trust model
// "LLM proposes → deterministic gate verifies → human ratifies".
//
// This module owns the *gate verifies* and *human ratifies* halves — pure,
// offline, deterministic. It does NOT contain the LLM proposer (that is the
// envisioned build, a Boundary-Eval variable); it takes a *proposed* codification
// as data and checks it against the SRC invariants so a human can ratify it.
//
// Implements the checkable parts of: SRC-R-01 (applicable set is a function of
// scope), SRC-R-02 (provenance to an authoritative clause), SRC-R-03 (proposed,
// never auto-bound — only ratified elements cross to STD), SRC-R-04 (two-way
// faithfulness), SRC-R-05 (relationships first-class, not smuggled), SRC-R-06
// (obligation level, classified from the source's modal language).

export type Obligation = "mandatory" | "recommended" | "permissive" | "informative";
export type ElementKind = "invariant" | "variable" | "relationship";

/** One codified element proposed from a standard's prose. Pure data — no live
 *  predicate — so it is serializable, fingerprintable (PID), and ratifiable. */
export interface CodifiedElement {
  kind: ElementKind;
  key: string;
  obligation: Obligation;
  /** The machine-checkable expression, declaratively (STD turns this into a
   *  predicate at conformance time). e.g. "ingressRank(ingress) >= rank('IP65')". */
  expr: string;
  /** Provenance to the external authority + clause (SRC-R-02). Empty ⇒ rejected. */
  src: string;
  /** SRC-R-03: false until a human ratifies. Only ratified elements cross to STD. */
  ratified: boolean;
}

/** The ratified codified inputs for one slot at one scope version — exactly what
 *  STD consumes and PID binds a PCID to. */
export interface ConstraintSet {
  slot: string;
  scopeVersion: string;
  elements: CodifiedElement[];
}

/** A design scope: a version plus the tags (customer/sales intent) that drive
 *  which authoritative standards apply. */
export interface Scope {
  version: string;
  tags: string[];
}

// SRC-R-01: a deterministic mapping from scope intent → applicable standards.
// (A real system would maintain this catalog; here it is a small fixed table so
// the "changing scope re-derives the set" invariant is checkable.)
const STANDARD_RULES: Array<{ tag: string; standard: string }> = [
  { tag: "humidity", standard: "MIL-STD-810H:507.6" },
  { tag: "temperature", standard: "MIL-STD-810H:501/502" },
  { tag: "vibration", standard: "MIL-STD-810H:514" },
  { tag: "washdown", standard: "MIL-STD-810H:509-corrosion" }, // scope pull → corrosion
  { tag: "ingress", standard: "IEC-60529" },
];

/** SRC-R-01: the applicable standard set is a pure function of the scope. Change a
 *  tag and the set re-derives; deterministic + order-independent. */
export function applicableStandards(scope: Scope): string[] {
  const tags = new Set(scope.tags);
  const found = STANDARD_RULES.filter((r) => tags.has(r.tag)).map((r) => r.standard);
  return [...new Set(found)].sort();
}

/** SRC-R-06: classify a source clause's normative strength from its modal words.
 *  Reuses the RFC 2119 / ISO-IEC vocabulary; deterministic and case-insensitive. */
export function classifyObligation(src: string): Obligation {
  const t = src.toLowerCase();
  if (/\b(shall|must|required)\b/.test(t)) return "mandatory";
  if (/\b(should|recommended)\b/.test(t)) return "recommended";
  if (/\b(may|optional|can)\b/.test(t)) return "permissive";
  return "informative";
}

/** SRC-R-05/-R-06: an element is cleanly typed iff its kind and obligation are in
 *  the allowed sets and it has a key. */
export function isCleanlyTyped(el: CodifiedElement): boolean {
  const kinds: ElementKind[] = ["invariant", "variable", "relationship"];
  const obls: Obligation[] = ["mandatory", "recommended", "permissive", "informative"];
  return kinds.includes(el.kind) && obls.includes(el.obligation) && !!el.key.trim();
}

/** SRC-R-05: a conditional guard ("if … then …") is a relationship. If an element
 *  is NOT a relationship but its expr reads like a guard, it has been smuggled. */
export function isSmuggledGuard(el: CodifiedElement): boolean {
  const guardish = /(^|\W)(if|when)\W|=>|→|\bimplies\b/i.test(el.expr);
  return guardish && el.kind !== "relationship";
}

/** SRC-R-02: elements whose provenance is missing (no authoritative source clause). */
export function unsourced(elements: CodifiedElement[]): CodifiedElement[] {
  return elements.filter((e) => !e.src || !e.src.trim());
}

/** SRC-R-03: only ratified elements may cross the seam into STD as inputs. */
export function ratifiedInputs(elements: CodifiedElement[]): CodifiedElement[] {
  return elements.filter((e) => e.ratified);
}
export function hasUnratified(elements: CodifiedElement[]): boolean {
  return elements.some((e) => !e.ratified);
}

export interface Faithfulness {
  ok: boolean;
  overreach: string[]; // codified keys not mandated by the scope/source (invented)
  undercovered: string[]; // scope-mandated keys left un-codified (silent gap)
}

/** SRC-R-04: two-way faithfulness. Nothing codified beyond what is mandated, and
 *  nothing mandated left un-codified. */
export function checkFaithfulness(mandatedKeys: string[], elements: CodifiedElement[]): Faithfulness {
  const mandated = new Set(mandatedKeys);
  const codified = new Set(elements.map((e) => e.key));
  const overreach = [...codified].filter((k) => !mandated.has(k)).sort();
  const undercovered = [...mandated].filter((k) => !codified.has(k)).sort();
  return { ok: overreach.length === 0 && undercovered.length === 0, overreach, undercovered };
}

export interface CodificationReport {
  ok: boolean;
  unsourced: string[]; // SRC-R-02 offenders (keys)
  malformed: string[]; // SRC-R-05/-R-06 not-cleanly-typed (keys)
  smuggledGuards: string[]; // SRC-R-05 offenders (keys)
  faithfulness: Faithfulness; // SRC-R-04
  unratifiedCrossing: boolean; // SRC-R-03: would any un-ratified element cross?
}

/** The full SRC gate over a proposed codification for one slot: everything a human
 *  needs verified before ratifying. `mandatedKeys` is the scope/standard-derived
 *  expectation the codification must faithfully cover. */
export function verifyCodification(mandatedKeys: string[], elements: CodifiedElement[]): CodificationReport {
  const rep: CodificationReport = {
    ok: false,
    unsourced: unsourced(elements).map((e) => e.key),
    malformed: elements.filter((e) => !isCleanlyTyped(e)).map((e) => e.key),
    smuggledGuards: elements.filter(isSmuggledGuard).map((e) => e.key),
    faithfulness: checkFaithfulness(mandatedKeys, elements),
    unratifiedCrossing: hasUnratified(elements),
  };
  rep.ok =
    rep.unsourced.length === 0 &&
    rep.malformed.length === 0 &&
    rep.smuggledGuards.length === 0 &&
    rep.faithfulness.ok;
  return rep;
}
