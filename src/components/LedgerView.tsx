"use client";

import { Database, Gauge, PiggyBank, ReceiptText } from "lucide-react";
import type { LedgerTicket } from "@/lib/risk-types";
import { fmtNum, fmtUsd } from "@/lib/risk-model";
import { LedgerPanel } from "./LedgerPanel";

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="aegis-panel flex items-center gap-3.5 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
        <div className="num truncate text-lg font-bold text-slate-900 dark:text-slate-100">
          {value}
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

export function LedgerView({
  tickets,
  persistence,
}: {
  tickets: LedgerTicket[];
  persistence: "POSTGRES" | "OFFLINE";
}) {
  const totalSaved = tickets.reduce((s, t) => s + t.savedUsd, 0);
  const swaps = tickets.filter((t) => t.action === "COLLATERAL_SWAP").length;
  const avgLatency =
    tickets.length > 0
      ? Math.round(tickets.reduce((s, t) => s + t.latencyMs, 0) / tickets.length)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ReceiptText className="h-4.5 w-4.5" />}
          label="Execution tickets"
          value={fmtNum(tickets.length, 0)}
          sub={`${swaps} collateral swaps`}
        />
        <StatCard
          icon={<PiggyBank className="h-4.5 w-4.5" />}
          label="Margin preserved"
          value={fmtUsd(totalSaved, 0)}
          sub="projected drawdown avoided"
        />
        <StatCard
          icon={<Gauge className="h-4.5 w-4.5" />}
          label="Avg fill latency"
          value={`${fmtNum(avgLatency, 0)}ms`}
          sub="Bitget spot route (ccxt)"
        />
        <StatCard
          icon={<Database className="h-4.5 w-4.5" />}
          label="Ledger store"
          value={persistence === "POSTGRES" ? "Postgres" : "Local"}
          sub={persistence === "POSTGRES" ? "append-only · replicated" : "seed replay mode"}
        />
      </div>
      <LedgerPanel tickets={tickets} persistence={persistence} />
    </div>
  );
}
