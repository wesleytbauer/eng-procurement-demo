// PART 1 — the invented suppliers.
//
// 12 suppliers seeded into a local master. Identity-resolution bait is built in:
// "Acme Steel Inc" arrives under three spellings/feeds (one with no tax id), and a
// parallel external system-of-record seeds the SAME identities under its own
// spellings — so the demo can prove (SUP-R-01/-R-02/-R-05) that one company resolves
// to one identity and that swapping the backing store leaves the contract unchanged.

import {
  localRegistry,
  externalSoRRegistry,
  sourced,
  type SupplierRef,
  type SupplierRegistry,
  type SupplierSeed,
  type SupplierId,
} from "../../lib/supplier.js";

const LOCAL_SEEDS: SupplierSeed[] = [
  {
    canonicalName: "Acme Steel Inc",
    taxIds: ["11-1111111"],
    aka: ["ACME STEEL", "Acme Steel Incorporated"],
    attributes: {
      duns: sourced("00-111-0000", "dnb-feed", "asserted"),
      tier: sourced(1, "owner", "authoritative"),
    },
  },
  { canonicalName: "Globex Plastics LLC", taxIds: ["22-2222222"], aka: ["Globex Plastics"], attributes: { duns: sourced("00-222-0000", "dnb-feed", "asserted") } },
  { canonicalName: "Initech Controls Co", taxIds: ["33-3333333"] },
  { canonicalName: "Umbrella Encoders GmbH", taxIds: ["44-4444444"], aka: ["Umbrella Encoders"] },
  { canonicalName: "Stark Harnessing Ltd", taxIds: ["55-5555555"] },
  { canonicalName: "Wayne Fasteners Corp", taxIds: ["66-6666666"] },
  { canonicalName: "Wonka Encoder Works", taxIds: ["77-7777777"] },
  { canonicalName: "Soylent Drives LLC", taxIds: ["88-8888888"] },
  { canonicalName: "Tyrell Gearworks", taxIds: ["99-9999999"] },
  { canonicalName: "Cyberdyne Internal MRO", taxIds: ["10-1010101"] },
  { canonicalName: "Hooli Housings Inc", taxIds: ["12-1212121"] },
  { canonicalName: "Vandelay Wiring", taxIds: ["13-1313131"] },
];

// The external system of record — same 12 identities, the SoR's own spellings.
const SOR_SEEDS: SupplierSeed[] = [
  { canonicalName: "ACME STEEL CORP", taxIds: ["11-1111111"] },
  { canonicalName: "Globex Plastics Limited", taxIds: ["22-2222222"] },
  { canonicalName: "Initech Controls", taxIds: ["33-3333333"] },
  { canonicalName: "Umbrella Encoders", taxIds: ["44-4444444"] },
  { canonicalName: "Stark Harnessing", taxIds: ["55-5555555"] },
  { canonicalName: "Wayne Fasteners", taxIds: ["66-6666666"] },
  { canonicalName: "Wonka Encoder Works", taxIds: ["77-7777777"] },
  { canonicalName: "Soylent Drives", taxIds: ["88-8888888"] },
  { canonicalName: "Tyrell Gearworks Inc", taxIds: ["99-9999999"] },
  { canonicalName: "Cyberdyne Internal MRO", taxIds: ["10-1010101"] },
  { canonicalName: "Hooli Housings", taxIds: ["12-1212121"] },
  { canonicalName: "Vandelay Industries Wiring", taxIds: ["13-1313131"] },
];

export const registry: SupplierRegistry = localRegistry(LOCAL_SEEDS);
export const sor: SupplierRegistry = externalSoRRegistry(SOR_SEEDS);

// Resolved canonical ids, by short handle, for the catalog/quotes to reference.
const id = (name: string, taxId: string): SupplierId => registry.resolve({ name, taxId });
export const SID = {
  acme: id("Acme Steel Inc", "11-1111111"),
  globex: id("Globex Plastics LLC", "22-2222222"),
  initech: id("Initech Controls Co", "33-3333333"),
  umbrella: id("Umbrella Encoders GmbH", "44-4444444"),
  stark: id("Stark Harnessing Ltd", "55-5555555"),
  wayne: id("Wayne Fasteners Corp", "66-6666666"),
  wonka: id("Wonka Encoder Works", "77-7777777"),
  soylent: id("Soylent Drives LLC", "88-8888888"),
  tyrell: id("Tyrell Gearworks", "99-9999999"),
  cyberdyne: id("Cyberdyne Internal MRO", "10-1010101"),
  hooli: id("Hooli Housings Inc", "12-1212121"),
  vandelay: id("Vandelay Wiring", "13-1313131"),
} as const;

// Refs used to prove identity resolution + the local↔SoR partition equality.
// The three Acme refs (incl. the no-taxId name-only one) must collapse to one id.
export const RESOLUTION_REFS: SupplierRef[] = [
  { name: "Acme Steel Inc", taxId: "11-1111111", feed: "ariba" },
  { name: "ACME STEEL", taxId: "111111111", feed: "email" },
  { name: "Acme Steel Incorporated", feed: "manual" },
  { name: "Globex Plastics LLC", taxId: "22-2222222" },
  { name: "Globex Plastics", taxId: "222222222", feed: "edi" },
  { name: "Initech Controls Co", taxId: "33-3333333" },
  { name: "Umbrella Encoders GmbH", taxId: "44-4444444" },
  { name: "Stark Harnessing Ltd", taxId: "55-5555555" },
  { name: "Wayne Fasteners Corp", taxId: "66-6666666" },
  { name: "Wonka Encoder Works", taxId: "77-7777777" },
  { name: "Soylent Drives LLC", taxId: "88-8888888" },
  { name: "Tyrell Gearworks", taxId: "99-9999999" },
  { name: "Cyberdyne Internal MRO", taxId: "10-1010101" },
  { name: "Hooli Housings Inc", taxId: "12-1212121" },
  { name: "Vandelay Wiring", taxId: "13-1313131" },
];
