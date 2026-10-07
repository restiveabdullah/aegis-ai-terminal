import {
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Immutable execution & audit ledger for the Aegis risk engine.
 * Every collateral maneuver (live or simulated) is persisted here so the
 * terminal can reconstruct a signed, chronological execution ticket stream.
 */
export const aegisLedger = pgTable("aegis_ledger", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  ts: timestamp("ts", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  action: text("action").notNull(),
  assetFrom: text("asset_from").notNull(),
  assetTo: text("asset_to").notNull(),
  amountUsd: numeric("amount_usd", { precision: 24, scale: 8 }).notNull(),
  qty: numeric("qty", { precision: 24, scale: 8 }).notNull(),
  execPrice: numeric("exec_price", { precision: 24, scale: 8 }).notNull(),
  filledUsd: numeric("filled_usd", { precision: 24, scale: 8 }).notNull(),
  slippageBps: numeric("slippage_bps", { precision: 10, scale: 4 }).notNull(),
  feeUsd: numeric("fee_usd", { precision: 24, scale: 8 }).notNull(),
  savedUsd: numeric("saved_usd", { precision: 24, scale: 8 }).notNull(),
  orderId: text("order_id").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  sig: text("sig").notNull(),
  meta: jsonb("meta"),
});
