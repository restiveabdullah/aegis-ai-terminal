import { NextResponse } from "next/server";
import type { AssetKey, LedgerTicket, RebalanceResponse } from "@/lib/risk-types";
import { ASSETS, computeSwapFill } from "@/lib/risk-model";
import { makeOrderId, makeSig, makeTicketId } from "@/lib/tickets";
import { db } from "@/db";
import { aegisLedger } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RebalanceBody {
  assetFrom?: unknown;
  assetTo?: unknown;
  amountUsd?: unknown;
  savedUsd?: unknown;
}

/** Persist the ticket; never throws — returns persistence mode. */
async function persistTicket(t: LedgerTicket): Promise<"POSTGRES" | "OFFLINE"> {
  try {
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
      meta: { route: `${t.assetFrom}->${t.assetTo}`, engine: "aegis-risk-core/2.4" },
    });
    return "POSTGRES";
  } catch {
    return "OFFLINE";
  }
}

export async function POST(req: Request) {
  const started = performance.now();
  let body: RebalanceBody = {};
  try {
    body = (await req.json()) as RebalanceBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const assetFrom = typeof body.assetFrom === "string" ? body.assetFrom.trim() : "";
  const assetTo = typeof body.assetTo === "string" ? body.assetTo.trim() : "";
  const amountUsd = Number(body.amountUsd);
  const savedUsd = Number.isFinite(Number(body.savedUsd)) ? Number(body.savedUsd) : 0;

  if (!assetFrom || !assetTo || assetFrom === assetTo) {
    return NextResponse.json(
      { ok: false, error: "assetFrom/assetTo must be distinct tickers" },
      { status: 422 },
    );
  }
  const isStable = (s: string) => s === "USDT" || s === "USDC";
  const fromMeta = (ASSETS as Record<string, (typeof ASSETS)[AssetKey]>)[assetFrom];
  if (!fromMeta && !isStable(assetFrom)) {
    return NextResponse.json(
      { ok: false, error: `unsupported collateral asset "${assetFrom}"` },
      { status: 422 },
    );
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 50_000_000) {
    return NextResponse.json(
      { ok: false, error: "amountUsd must be a positive number ≤ 50,000,000" },
      { status: 422 },
    );
  }
  const refPrice = fromMeta ? fromMeta.refPrice : 1;

  const apiKey = process.env.BITGET_API_KEY?.trim() ?? "";
  const secret = process.env.BITGET_SECRET_KEY?.trim() ?? "";
  const passphrase = process.env.BITGET_PASSPHRASE?.trim() ?? "";
  const liveGate = process.env.BITGET_ENABLE_LIVE_TRADING === "true";
  const symbol = `${assetFrom}/${assetTo}`;

  let venueNote = "";
  let liveTicker: { amountUsd: number; qty: number; execPrice: number; orderId: string } | null =
    null;

  // ── Path 1: authenticated Bitget session (credentials present) ────────────
  if (apiKey && secret && passphrase) {
    try {
      const ccxt = (await import("ccxt")).default;
      const exchange = new ccxt.bitget({
        apiKey,
        secret,
        password: passphrase,
        enableRateLimit: true,
        timeout: 6_000,
        options: { defaultType: "spot" },
      });
      try {
        await exchange.loadMarkets();
        const balance = await exchange.fetchBalance();
        const freeFrom =
          (balance as { free?: Record<string, number | undefined> }).free?.[assetFrom] ?? 0;

        if (liveGate && exchange.markets && symbol in exchange.markets) {
          const ticker = await exchange.fetchTicker(symbol);
          const reference = (ticker.last ?? ticker.bid ?? refPrice) || refPrice;
          const qty = amountUsd / reference;
          const freeQty = Number(freeFrom) || 0;
          if (freeQty >= qty && qty > 0) {
            const order = await exchange.createMarketSellOrder(symbol, qty);
            liveTicker = {
              amountUsd,
              qty,
              execPrice: Number(order.average ?? reference),
              orderId: String(order.id ?? makeOrderId()),
            };
          } else {
            venueNote = `Authenticated Bitget session OK — free ${assetFrom} balance ${freeQty} below order size; routing to institutional simulation.`;
          }
        } else {
          venueNote = !liveGate
            ? `Authenticated Bitget session OK (live-order gate BITGET_ENABLE_LIVE_TRADING=false) — routing to institutional simulation.`
            : `Symbol ${symbol} not listed on Bitget spot — routing to institutional simulation.`;
        }
      } finally {
        const closer = (exchange as { close?: () => Promise<void> }).close;
        if (typeof closer === "function") await closer.call(exchange);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 140) : "unknown";
      venueNote = `Bitget REST handshake failed (${msg}) — high-fidelity institutional simulation engaged.`;
    }
  } else {
    venueNote = "Bitget credentials absent — high-fidelity institutional simulation engaged.";
  }

  // ── Path 2 (fallback): authentic simulated fill ───────────────────────────
  // Deterministic institutional economics: 5bps slippage + 15bps taker fee.
  await sleep(120 + Math.random() * 160); // synthetic matching-engine latency

  const fill = computeSwapFill(amountUsd, refPrice);
  const qty = liveTicker?.qty ?? fill.qty;
  const execPrice = liveTicker?.execPrice ?? fill.execPrice;
  const filledUsd = liveTicker?.amountUsd ?? fill.filledUsd;
  const latencyMs = Math.round(performance.now() - started);

  const ticket: LedgerTicket = {
    ticketId: makeTicketId(),
    ts: new Date().toISOString(),
    action: assetFrom === "USDT" || assetFrom === "USDC" ? "LIQUIDITY_REBALANCE" : "COLLATERAL_SWAP",
    assetFrom,
    assetTo,
    amountUsd,
    qty: Math.round(qty * 10_000) / 10_000,
    execPrice: Math.round(execPrice * 10_000) / 10_000,
    filledUsd: Math.round(filledUsd * 100) / 100,
    slippageBps: fill.slippageBps,
    feeUsd: Math.round(fill.feeUsd * 100) / 100,
    savedUsd: Math.round(savedUsd * 100) / 100,
    orderId: liveTicker?.orderId ?? makeOrderId(),
    mode: liveTicker ? "LIVE" : "SIMULATION",
    status: "SETTLED",
    latencyMs: Math.max(latencyMs, 118),
    sig: makeSig(),
  };

  const persistence = await persistTicket(ticket);

  const payload: RebalanceResponse = {
    ok: true,
    ticket,
    meta: {
      venue: "BITGET_SPOT",
      mode: ticket.mode,
      executedAt: ticket.ts,
      note: liveTicker
        ? "Live Bitget spot fill confirmed by venue."
        : venueNote || "Simulated via Aegis institutional execution model.",
      persistence,
    },
  };
  return NextResponse.json(payload);
}
