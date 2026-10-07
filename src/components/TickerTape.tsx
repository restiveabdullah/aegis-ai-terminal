"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { ASSET_LIST, MODEL, fmtNum, fmtPct, fmtSignedPct } from "@/lib/risk-model";
import type { AssetKey, EnginePhase } from "@/lib/risk-types";

function TapeItem({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta?: number;
  tone?: "emerald" | "rose" | "slate";
}) {
  const color =
    delta != null
      ? delta >= 0
        ? "text-emerald-600"
        : "text-rose-600"
      : tone === "emerald"
        ? "text-emerald-600"
        : tone === "rose"
          ? "text-rose-600"
          : "text-slate-800";
  return (
    <span className="mx-4 inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-slate-500">{label}</span>
      <span className={`num ${color}`}>{value}</span>
      {delta != null &&
        (delta >= 0 ? (
          <TrendingUp className="h-3 w-3 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-rose-500" />
        ))}
      {delta != null && <span className={`num ${color}`}>{fmtSignedPct(delta)}</span>}
      <span className="ml-3 text-slate-300">·</span>
    </span>
  );
}

export function TickerTape({
  btc,
  prices,
  mmr,
  phase,
}: {
  btc: number;
  prices: Record<AssetKey, number>;
  mmr: number;
  phase: EnginePhase;
}) {
  const btcDelta = ((btc - MODEL.baselineBtcMark) / MODEL.baselineBtcMark) * 100;
  const items = [
    <TapeItem key="btc" label="BTC/USDT" value={fmtNum(btc)} delta={btcDelta} />,
    ...ASSET_LIST.map((a) => (
      <TapeItem
        key={a.key}
        label={`${a.symbol}/USDT`}
        value={fmtNum(prices[a.key])}
        delta={((prices[a.key] - a.refPrice) / a.refPrice) * 100}
      />
    )),
    <TapeItem
      key="mmr"
      label="UTA MMR"
      value={fmtPct(mmr * 100)}
      tone={mmr >= 0.85 ? "rose" : mmr >= 0.7 ? "slate" : "emerald"}
    />,
    <TapeItem key="fnd" label="Funding" value="0.0100%" tone="slate" />,
    <TapeItem key="ins" label="Insurance fund" value="$412.6M" tone="emerald" />,
    <TapeItem
      key="sts"
      label="Engine state"
      value={phase.charAt(0) + phase.slice(1).toLowerCase()}
      tone={phase === "SECURED" ? "emerald" : phase === "IDLE" ? "slate" : "rose"}
    />,
  ];

  return (
    <div className="aegis-panel relative h-9 shrink-0 overflow-hidden">
      <div className="tape-track absolute left-0 top-0 flex h-full items-center text-[11px]">
        <div className="flex items-center">{items}</div>
        <div className="flex items-center" aria-hidden>
          {items}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
