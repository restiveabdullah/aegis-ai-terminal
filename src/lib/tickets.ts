// ── Audit-ticket construction helpers ────────────────────────────────────────
import type { LedgerTicket } from "./risk-types";

export function randomDigits(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

export function makeTicketId(d: Date = new Date()): string {
  const y = String(d.getUTCFullYear()).slice(2);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `AEG-${y}${m}${day}-${randomDigits(4)}`;
}

export function makeOrderId(): string {
  return `BGT-SPOT-${randomDigits(7)}`;
}

export function makeSig(): string {
  return `0x${randomHex(40)}`;
}

/**
 * Baseline tickets describing the account's initial collateralization.
 * Used both as PostgreSQL seed rows and as an offline fallback so the
 * terminal always renders a coherent audit history.
 */
export function buildSeedTickets(now: Date = new Date()): LedgerTicket[] {
  const t0 = new Date(now.getTime() - 26 * 60 * 60 * 1000 - 14_118);
  return [
    {
      ticketId: "AEG-SEED-0001",
      ts: t0.toISOString(),
      action: "LIQUIDITY_REBALANCE",
      assetFrom: "USDT",
      assetTo: "rAAPL",
      amountUsd: 25_000,
      qty: 107.7586,
      execPrice: 232.0,
      filledUsd: 24_937.5,
      slippageBps: 2,
      feeUsd: 20,
      savedUsd: 0,
      orderId: "BGT-SPOT-7712045",
      mode: "SIMULATION",
      status: "SETTLED",
      latencyMs: 214,
      sig: "0x9f2c41aa07be5580d13f90c2a5d4477e8113c90b",
    },
  ];
}
