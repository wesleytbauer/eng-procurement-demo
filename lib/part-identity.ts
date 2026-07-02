// Part Identity (PID) — mint a Part Constraint ID (PCID) at the engineer's
// approval and bind it, immutably, to the exact constraints (by fingerprint) and
// scope version it was approved against.
//
// The fingerprint/PCID split: constraint sets flow freely as cheap, content-
// addressed FINGERPRINTS (dedup by construction, no identity); a PCID is minted
// ONLY at approval, so identities never proliferate.
//
// Implements: PID-R-01 (minted at approval, never before), PID-R-02 (unique +
// immutable), PID-R-03 (binds part ↔ fingerprint ↔ scope version, resolves
// deterministically), PID-R-04 (equality by fingerprint, never by similarity).

import { createHash } from "node:crypto";
import { type CodifiedElement, type ConstraintSet } from "./sourcing.js";

export type Pcid = string;

export interface PartRef {
  /** A stable part reference the engineer specced (internal PN, MPN, …). The
   *  scheme is accidental; PID only requires that it identifies the chosen part. */
  partNo: string;
  description?: string;
}

/** A recommended part the engineer has NOT yet approved. Carries NO pcid
 *  (PID-R-01). */
export interface Recommendation {
  part: PartRef;
  constraints: ConstraintSet;
}

/** The immutable record minted at approval. Frozen — corrections supersede, never
 *  mutate (PID-R-02). */
export interface PcidRecord {
  readonly pcid: Pcid;
  readonly part: PartRef;
  readonly fingerprint: string; // of the bound constraint set (PID-R-03/-R-04)
  readonly scopeVersion: string;
  readonly supersedes?: Pcid; // set when this record replaces an earlier selection
}

// PID-R-04: content-address a constraint set. Canonicalize the *enforced* content
// (kind, key, obligation, expr) — order-independent — then hash. Identical
// constraints ⇒ identical fingerprint; any change ⇒ a different fingerprint. src
// and ratification are provenance/state, not part of what the part must MEET, so
// they are excluded from the constraint fingerprint.
function canonical(elements: CodifiedElement[]): string {
  return elements
    .map((e) => `${e.kind}${e.key}${e.obligation}${e.expr}`)
    .sort()
    .join("");
}

export function fingerprint(cs: ConstraintSet): string {
  return createHash("sha256").update(`${cs.slot}${canonical(cs.elements)}`).digest("hex");
}

/** True iff two constraint sets are the SAME by fingerprint. Equality is exact and
 *  deterministic — never fuzzy, semantic, or nearest-neighbor (PID-R-04). */
export function sameConstraints(a: ConstraintSet, b: ConstraintSet): boolean {
  return fingerprint(a) === fingerprint(b);
}

export interface ResolvedPcid {
  part: PartRef;
  constraints: ConstraintSet;
  scopeVersion: string;
  fingerprint: string;
}

/** The minting authority. Owns uniqueness and the fingerprint→constraints store so
 *  a PCID resolves deterministically. Nothing here mutates a minted record. */
export interface Minter {
  /** PID-R-01: approval is the mint trigger. Approving a recommendation mints
   *  exactly one unique PCID and binds it. */
  approve(rec: Recommendation): PcidRecord;
  /** Approve a whole recommended list at once — one PCID per part. */
  approveAll(recs: Recommendation[]): PcidRecord[];
  /** PID-R-02: correcting a selection mints a NEW pcid; the old one is untouched
   *  and still resolves to what it meant. */
  supersede(old: Pcid, rec: Recommendation): PcidRecord;
  /** PID-R-03: resolve a pcid to the exact constraints + scope version bound at
   *  mint. undefined for an unknown pcid (an unresolvable demand line — OPS-R-01). */
  resolve(pcid: Pcid): ResolvedPcid | undefined;
  minted(): Pcid[];
}

export function createMinter(prefix = "PCID"): Minter {
  let seq = 0;
  const records = new Map<Pcid, PcidRecord>();
  const constraintsByFp = new Map<string, ConstraintSet>();

  function mint(rec: Recommendation, supersedes?: Pcid): PcidRecord {
    seq += 1;
    // Opaque, unique, non-repeating key. Meaning lives in the bound record, never
    // encoded into the number (PID-R-02).
    const pcid: Pcid = `${prefix}-${String(seq).padStart(6, "0")}`;
    const fp = fingerprint(rec.constraints);
    if (!constraintsByFp.has(fp)) constraintsByFp.set(fp, rec.constraints);
    const record: PcidRecord = Object.freeze({
      pcid,
      part: Object.freeze({ ...rec.part }),
      fingerprint: fp,
      scopeVersion: rec.constraints.scopeVersion,
      ...(supersedes ? { supersedes } : {}),
    });
    records.set(pcid, record);
    return record;
  }

  return {
    approve: (rec) => mint(rec),
    approveAll: (recs) => recs.map((r) => mint(r)),
    supersede(old, rec) {
      if (!records.has(old)) throw new Error(`PID-R-02: cannot supersede unknown pcid ${old}`);
      return mint(rec, old);
    },
    resolve(pcid) {
      const r = records.get(pcid);
      if (!r) return undefined;
      const constraints = constraintsByFp.get(r.fingerprint);
      if (!constraints) return undefined;
      return { part: r.part, constraints, scopeVersion: r.scopeVersion, fingerprint: r.fingerprint };
    },
    minted: () => [...records.keys()],
  };
}
