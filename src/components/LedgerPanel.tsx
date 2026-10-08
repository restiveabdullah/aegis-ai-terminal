"use client";

import { ArrowRight, Database, Fingerprint } from "lucide-react";
import type { LedgerTicket } from "@/lib/risk-types";
import { fmtNum, fmtUsd } from "@/lib/risk-model";
import { Chip, HudPanel } from "./hud";

function TicketRow({ ticket, fresh }: { ticket: LedgerTicket; fresh: boolean }) {
  const [date, time] = ticket.ts.split("T");
  return (
    <tr
      className={`border-b border-slate-100 text-xs transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 ${fresh ? "row-flash" : ""}`}
    >
      <td className="py-2.5 pl-4 pr-3 align-top">
        <div className="num whitespace-nowrap text-slate-400 dark:text-slate-500">{date}</div>
        <div className="num whitespace-nowrap text-slate-700 dark:text-slate-300">
          {time.replace("Z", "")}
          <span className="text-slate-400 dark:text-slate-500">Z</span>
        </div>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <Chip tone={ticket.action === "COLLATERAL_SWAP" ? "amber" : "sky"}>
          {ticket.action === "COLLATERAL_SWAP" ? "Collateral swap" : "Liquidity rebalance"}
        </Chip>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <span className="num inline-flex items-center gap-1 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
          {ticket.assetFrom}
          <ArrowRight className="h-3 w-3 text-emerald-500" />
          {ticket.assetTo}
        </span>
        <div className="num mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{fmtUsd(ticket.amountUsd, 0)} clip</div>
      </td>
      <td className="num py-2.5 pr-3 align-top text-slate-600 dark:text-slate-400">{fmtNum(ticket.qty, 4)}</td>
      <td className="num py-2.5 pr-3 align-top font-medium text-slate-800 dark:text-slate-200">
        {fmtUsd(ticket.execPrice)}
      </td>
      <td className="num py-2.5 pr-3 align-top text-slate-500 dark:text-slate-400">{fmtNum(ticket.slippageBps, 1)}bp</td>
      <td className="num py-2.5 pr-3 align-top">
        {ticket.savedUsd > 0 ? (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{fmtUsd(ticket.savedUsd, 0)}</span>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>
      <td className="py-2.5 pr-3 align-top">
        <div className="num whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">{ticket.orderId}</div>
        <div className="num text-[11px] text-slate-400 dark:text-slate-500">{ticket.latencyMs}ms</div>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <Chip tone={ticket.mode === "LIVE" ? "indigo" : "slate"}>
          {ticket.mode === "LIVE" ? "Live" : "Simulated"}
        </Chip>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <Chip tone="emerald">{ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}</Chip>
      </td>
    </tr>
  );
}

export function LedgerPanel({
  tickets,
  persistence,
}: {
  tickets: LedgerTicket[];
  persistence: "POSTGRES" | "OFFLINE";
}) {
  const latest = tickets[0];
  return (
    <HudPanel
      tag="Execution & audit ledger"
      title="Immutable append-only ticket stream"
      right={
        <>
          <Chip tone={persistence === "POSTGRES" ? "emerald" : "amber"}>
            <Database className="h-3 w-3" />
            {persistence === "POSTGRES" ? "Synced" : "Local replay"}
          </Chip>
          <Chip tone="slate">
            <span className="num">{tickets.length}</span> tickets
          </Chip>
        </>
      }
      bodyClassName="flex flex-col p-5"
    >
      <div className="aegis-scroll min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {tickets.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center p-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Awaiting first execution ticket — defense events settle here
          </div>
        ) : (
          <table className="w-full min-w-[680px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <th className="py-2.5 pl-4 pr-3">Timestamp (ISO · ms)</th>
                <th className="py-2.5 pr-3">Action</th>
                <th className="py-2.5 pr-3">Route</th>
                <th className="py-2.5 pr-3">Qty</th>
                <th className="py-2.5 pr-3">Exec px</th>
                <th className="py-2.5 pr-3">Slip</th>
                <th className="py-2.5 pr-3">Saved</th>
                <th className="py-2.5 pr-3">Order · lat</th>
                <th className="py-2.5 pr-3">Mode</th>
                <th className="py-2.5 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <TicketRow key={t.ticketId} ticket={t} fresh={i === 0 && t.action === "COLLATERAL_SWAP"} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Fingerprint className="h-3 w-3 text-emerald-600" />
          Latest sig <span className="num text-slate-700 dark:text-slate-300">{latest ? `${latest.sig.slice(0, 18)}…` : "—"}</span>
        </span>
        <span>Retention 7y · WORM storage</span>
      </div>
    </HudPanel>
  );
}
