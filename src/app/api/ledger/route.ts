import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { aegisLedger } from "@/db/schema";
import type { LedgerResponse, LedgerTicket } from "@/lib/risk-types";
import { buildSeedTickets } from "@/lib/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = typeof aegisLedger.$inferSelect;

function rowToTicket(r: Row): LedgerTicket {
  return {
    ticketId: r.ticketId,
    ts: r.ts.toISOString(),
    action: r.action as LedgerTicket["action"],
    assetFrom: r.assetFrom,
    assetTo: r.assetTo,
    amountUsd: Number(r.amountUsd),
    qty: Number(r.qty),
    execPrice: Number(r.execPrice),
    filledUsd: Number(r.filledUsd),
    slippageBps: Number(r.slippageBps),
    feeUsd: Number(r.feeUsd),
    savedUsd: Number(r.savedUsd),
    orderId: r.orderId,
    mode: r.mode as LedgerTicket["mode"],
    status: r.status as LedgerTicket["status"],
    latencyMs: r.latencyMs,
    sig: r.sig,
  };
}

async function ensureSeeded(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aegisLedger);
  if (count > 0) return;
  for (const t of buildSeedTickets()) {
    await db.insert(aegisLedger).values({
      ticketId: t.ticketId,
      ts: new Date(t.ts),
      action: t.action,
      assetFrom: t.assetFrom,
      assetTo: t.assetTo,
      amountUsd: String(t.amountUsd),
      qty: String(t.qty),
      execPrice: String(t.execPrice),
      filledUsd: String(t.filledUsd),
      slippageBps: String(t.slippageBps),
      feeUsd: String(t.feeUsd),
      savedUsd: String(t.savedUsd),
      orderId: t.orderId,
      mode: t.mode,
      status: t.status,
      latencyMs: t.latencyMs,
      sig: t.sig,
      meta: { seed: true },
    });
  }
}

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(aegisLedger)
      .orderBy(desc(aegisLedger.ts))
      .limit(50);
    const payload: LedgerResponse = {
      ok: true,
      tickets: rows.map(rowToTicket),
      persistence: "POSTGRES",
    };
    return NextResponse.json(payload);
  } catch {
    const payload: LedgerResponse = {
      ok: true,
      tickets: buildSeedTickets(),
      persistence: "OFFLINE",
    };
    return NextResponse.json(payload);
  }
}
