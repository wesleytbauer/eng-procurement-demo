// Provenance primitives — the cross-cutting line carried inside the domains
// (root §4) rather than as a separate Foundation kernel. A fact that touches
// "truth" (a supplier attribute, a catalog entry's lineage) carries where it
// came from and how far it is trusted. Unsourced facts can be recorded but never
// treated as authoritative.

export type Trust = "unverified" | "asserted" | "authoritative";

export interface Sourced<T> {
  value: T;
  source: string; // what produced this fact (a feed, the SoR, the owner)
  trust: Trust;
}

/** Construct a sourced fact. An empty source is rejected — provenance is mandatory. */
export function sourced<T>(value: T, source: string, trust: Trust = "asserted"): Sourced<T> {
  if (!source || !source.trim()) throw new Error("provenance required: a fact cannot be recorded without a source");
  return { value, source, trust };
}

/** The value only if it is authoritative; otherwise undefined. Lets callers refuse
 *  to act on merely-asserted or unverified attributes. */
export function authoritative<T>(s: Sourced<T> | undefined): T | undefined {
  return s && s.trust === "authoritative" ? s.value : undefined;
}
