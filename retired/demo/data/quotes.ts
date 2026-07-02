// PART 1 — the commercial layer (kept out of the catalog on purpose).
//
// Prices/leads are tuned so the awards are clean and quotable:
//  - motor: Soylent is cheapest (37) AND fastest (14) → wins v1 → and is exactly the
//    part the v1→v2 change knocks out (ip54 + 12V). The engineered punchline.
//  - controller: Soylent (12V) wins v1 → v2 invalidates ALL controller options → gap.
//  - housing: Acme's ip65 (the survivor) is priced to win, so it is NOT at risk.
//  - gearbox: price/lead are split between Globex and Tyrell so PERFORMANCE decides —
//    used to show the closed loop (a poor on-time record flips the award).

import type { Quote } from "../lib/types.js";
import { SID } from "./suppliers.js";

export const QUOTES: Quote[] = [
  { entryId: "m-acme-24", slotKey: "motor", supplierId: SID.acme, unitPriceUsd: 42.0, leadTimeDays: 21, moq: 50 },
  { entryId: "m-acme-12", slotKey: "motor", supplierId: SID.acme, unitPriceUsd: 39.5, leadTimeDays: 21, moq: 50 },
  { entryId: "m-globex-24", slotKey: "motor", supplierId: SID.globex, unitPriceUsd: 40.0, leadTimeDays: 35, moq: 100 },
  { entryId: "m-soylent-54", slotKey: "motor", supplierId: SID.soylent, unitPriceUsd: 37.0, leadTimeDays: 14, moq: 25 },

  { entryId: "g-globex-10", slotKey: "gearbox", supplierId: SID.globex, unitPriceUsd: 30.0, leadTimeDays: 25, moq: 100 },
  { entryId: "g-tyrell-20", slotKey: "gearbox", supplierId: SID.tyrell, unitPriceUsd: 33.0, leadTimeDays: 18, moq: 50 },

  { entryId: "e-umbrella-1000", slotKey: "encoder", supplierId: SID.umbrella, unitPriceUsd: 18.0, leadTimeDays: 20, moq: 50 },
  { entryId: "e-wonka-1000", slotKey: "encoder", supplierId: SID.wonka, unitPriceUsd: 19.0, leadTimeDays: 28, moq: 40 },

  { entryId: "c-soylent-12", slotKey: "controller", supplierId: SID.soylent, unitPriceUsd: 26.0, leadTimeDays: 16, moq: 25 },
  { entryId: "c-acme-12", slotKey: "controller", supplierId: SID.acme, unitPriceUsd: 29.0, leadTimeDays: 22, moq: 50 },

  { entryId: "h-acme-65", slotKey: "housing", supplierId: SID.acme, unitPriceUsd: 19.0, leadTimeDays: 15, moq: 50 },
  { entryId: "h-acme-54", slotKey: "housing", supplierId: SID.acme, unitPriceUsd: 22.0, leadTimeDays: 18, moq: 50 },
  { entryId: "h-hooli-54", slotKey: "housing", supplierId: SID.hooli, unitPriceUsd: 21.0, leadTimeDays: 20, moq: 60 },

  { entryId: "hn-stark-20", slotKey: "harness", supplierId: SID.stark, unitPriceUsd: 8.0, leadTimeDays: 12, moq: 100 },

  { entryId: "f-wayne-a2", slotKey: "fasteners", supplierId: SID.wayne, unitPriceUsd: 0.5, leadTimeDays: 10, moq: 500 },
  { entryId: "f-cyberdyne-a4", slotKey: "fasteners", supplierId: SID.cyberdyne, unitPriceUsd: 0.7, leadTimeDays: 8, moq: 200 },
];
