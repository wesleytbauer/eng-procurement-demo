// Shared demo types. Kept separate so data/* and lib/* don't import each other in a
// cycle. These describe the synthetic world; they never alter the framework's own types.

import type { ProductLine, Standard } from "../../lib/standard.js";
import type { SupplierId } from "../../lib/supplier.js";

/** One product slot's derived standard: its own ProductLine + Standard, and the
 *  single-key requiredKeys used by checkCoverage/reconcileToStandard. The whole
 *  "product standard" is a Map<slot, SlotStandard> (see data/product.ts). */
export interface SlotStandard {
  key: string;
  line: ProductLine;
  std: Standard;
  requiredKeys: string[];
}

/** Demo-only commercial data for a catalog entry. Deliberately NOT part of
 *  CatalogEntry — the catalog decides conformance, never price. The award scorer
 *  joins quotes to entries by entryId. */
export interface Quote {
  entryId: string;
  slotKey: string;
  supplierId: SupplierId;
  unitPriceUsd: number;
  leadTimeDays: number;
  moq: number;
}
