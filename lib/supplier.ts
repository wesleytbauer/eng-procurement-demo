// Supplier Truth (SUP) — a source-of-record-agnostic abstraction of suppliers.
//
// The whole point: consumers depend on the INTERFACE (SupplierRegistry), never on
// whether the master data is a local store we built or an external system of
// record we integrated. Build-vs-integrate is a Boundary Eval variable that lives
// entirely behind this interface (SUP-R-01, SUP-R-05).
//
// Implements: SUP-R-01 (interface not store), SUP-R-02 (stable resolved identity —
// resolution consults the master's known aliases, so a name-only reference links to
// the same supplier known by tax id), SUP-R-03 (attribute provenance + trust),
// SUP-R-04 (truth not behavior — there is deliberately NO performance field here).

import { type Sourced, sourced } from "./provenance.js";

export type SupplierId = string;

export interface SupplierRef {
  name: string;
  taxId?: string; // strongest identity signal when present
  feed?: string; // which inbound feed this ref arrived on (provenance of the ref)
}

export interface Supplier {
  id: SupplierId;
  canonicalName: string;
  // master-data attributes only — who the supplier is, each sourced + trust-rated.
  attributes: Record<string, Sourced<string | number>>;
  // NOTE: no performance / observed-risk fields. SUP-R-04 keeps those in OPS.
}

/** How a supplier is registered in a master: its canonical name plus every alias
 *  (tax ids, alternate names) by which a reference might arrive. Resolution indexes
 *  all of these onto one identity. */
export interface SupplierSeed {
  canonicalName: string;
  taxIds?: string[];
  aka?: string[];
  attributes?: Record<string, Sourced<string | number>>;
}

/** The contract every consumer (Catalog, Operations) depends on. Two backings —
 *  a local master and an external system of record — both satisfy it identically. */
export interface SupplierRegistry {
  resolve(ref: SupplierRef): SupplierId;
  get(id: SupplierId): Supplier | undefined;
  ids(): SupplierId[];
}

const SUFFIXES = new Set(["inc", "incorporated", "llc", "ltd", "limited", "corp", "corporation", "co", "company", "gmbh"]);

function taxKey(taxId: string): string {
  return `tax:${taxId.replace(/[^0-9a-z]/gi, "").toLowerCase()}`;
}

function nameKey(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !SUFFIXES.has(t));
  return `name:${tokens.join(" ")}`;
}

function makeRegistry(seeds: SupplierSeed[]): SupplierRegistry {
  const index = new Map<string, SupplierId>(); // every alias key → canonical id
  const byId = new Map<SupplierId, Supplier>();
  const order: SupplierId[] = [];

  for (const seed of seeds) {
    const taxKeys = (seed.taxIds ?? []).map(taxKey);
    // Canonical id: tax identity when known (strongest), else normalized name.
    const id: SupplierId = taxKeys[0] ?? nameKey(seed.canonicalName);
    if (!byId.has(id)) {
      // SUP-R-03: attributes arrive already sourced (sourced() throws on empty source).
      byId.set(id, { id, canonicalName: seed.canonicalName, attributes: seed.attributes ?? {} });
      order.push(id);
    }
    for (const tk of taxKeys) index.set(tk, id);
    index.set(nameKey(seed.canonicalName), id);
    for (const a of seed.aka ?? []) index.set(nameKey(a), id);
  }

  return {
    // SUP-R-02: resolution consults the master. Tax id first (authoritative), then
    // any known name alias. An unknown ref yields a deterministic provisional
    // identity rather than silently colliding with an existing one.
    resolve(ref) {
      if (ref.taxId && ref.taxId.trim()) {
        const hit = index.get(taxKey(ref.taxId));
        if (hit) return hit;
      }
      const nk = nameKey(ref.name);
      const hit = index.get(nk);
      if (hit) return hit;
      return ref.taxId && ref.taxId.trim() ? taxKey(ref.taxId) : nk;
    },
    get: (id) => byId.get(id),
    ids: () => [...order],
  };
}

/** A registry the system OWNS (the "build" branch of SUP-R-05). */
export function localRegistry(seeds: SupplierSeed[]): SupplierRegistry {
  return makeRegistry(seeds);
}

/** A registry backed by an external system of record (the "integrate" branch).
 *  Same contract; the SoR brings its own spellings/aliases for the same identities. */
export function externalSoRRegistry(seeds: SupplierSeed[]): SupplierRegistry {
  return makeRegistry(seeds);
}

/** Convenience re-export so selftests/consumers build sourced master data without
 *  importing provenance.ts directly. */
export { sourced };

/** The partition a registry induces over a set of refs: refs that resolve to the
 *  same id are grouped. This is the *observable contract* consumers rely on, so two
 *  backings agree iff their partitions agree (SUP-R-01/-R-05). */
export function partition(reg: SupplierRegistry, refs: SupplierRef[]): Map<SupplierId, number[]> {
  const groups = new Map<SupplierId, number[]>();
  refs.forEach((ref, i) => {
    const id = reg.resolve(ref);
    const g = groups.get(id) ?? [];
    g.push(i);
    groups.set(id, g);
  });
  return groups;
}

export function partitionsEqual(a: Map<SupplierId, number[]>, b: Map<SupplierId, number[]>): boolean {
  const norm = (m: Map<SupplierId, number[]>) =>
    [...m.values()].map((idxs) => idxs.slice().sort((x, y) => x - y).join(",")).sort().join("|");
  return norm(a) === norm(b);
}
