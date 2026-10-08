"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  ShieldCheck,
} from "lucide-react";
import type { AssetKey, CollateralState, EnginePhase } from "@/lib/risk-types";
import {
  ASSET_LIST,
  MODEL,
  fmtNum,
  fmtPct,
  fmtSignedUsd,
  fmtUsd,
  mmrBand,
  type AssetMeta,
  type MarginSnapshot,
} from "@/lib/risk-model";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import { Chip, HudPanel, type Tone } from "./hud";
import { MmrGauge } from "./MmrGauge";

const BAND_CHIP: Record<string, Tone> = {
  optimal: "emerald",
  elevated: "sky",
  warning: "amber",
  liquidation: "rose",
};

export function MarginPanel({
  snapshot,
  collateral,
  phase,
  asset,
  livePrice,
  busy,
  onSelectAsset,
  dark = false,
}: {
  snapshot: MarginSnapshot;
  collateral: CollateralState;
  phase: EnginePhase;
  asset: AssetMeta;
  livePrice: number;
  busy: boolean;
  onSelectAsset: (a: AssetKey) => void;
  dark?: boolean;
}) {
  const assetUsd = useTweenedNumber(collateral.assetUsd, 1200);
  const usdtUsd = useTweenedNumber(collateral.usdtUsd, 1200);
  const band = mmrBand(snapshot.mmr);
  const upnlPos = snapshot.upnlUsd >= 0;
  const swapped = collateral.assetUsd <= 0.01;
  const BAR_MAX = 30_000;
  const haircutPct = Math.round(asset.haircut * 100);

  return (
    <HudPanel
      tag="Margin & account health"
      title="Bitget unified trading account"
      right={
        <Chip tone={phase === "SECURED" ? "emerald" : BAND_CHIP[band.tone]}>
          {phase === "SECURED" ? "Hedged" : band.label}
        </Chip>
      }
      bodyClassName="p-5"
    >
      <div className={phase === "DEFENSE" || phase === "SWAPPING" ? "animate-pulse" : ""}>
        {/* ── Open derivatives position ── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Chip tone="emerald">Long</Chip>
              <span className="num text-xs font-semibold text-slate-900 dark:text-slate-100">
                2.5 BTCUSDT Perp
              </span>
            </div>
            <Chip tone="slate"><span className="num">20x</span> cross</Chip>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Notional</div>
              <div className="num text-xs font-semibold text-slate-900 dark:text-slate-100">
                {fmtUsd(snapshot.notionalUsd, 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Entry</div>
              <div className="num text-xs font-semibold text-slate-700 dark:text-slate-300">
                {fmtNum(MODEL.entryPriceBtc, 0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Mark</div>
              <div className="num flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {fmtNum(snapshot.markBtc, 0)}
                {upnlPos ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-rose-500" />
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">uPnL</div>
              <div className={`num text-xs font-semibold ${upnlPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {fmtSignedUsd(snapshot.upnlUsd, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Collateral selector ── */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Collateral breakdown</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Multi-asset mode</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {ASSET_LIST.map((a) => (
            <button
              key={a.key}
              onClick={() => onSelectAsset(a.key)}
              disabled={busy}
              title={`${a.company} · ${a.sector} · haircut ${Math.round(a.haircut * 100)}%`}
              className={`num rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition disabled:opacity-40 ${
                a.key === asset.key
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {a.symbol}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {/* tokenized equity leg */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="num font-semibold text-slate-900 dark:text-slate-100">{asset.symbol}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {asset.company} · {asset.sector}</span>
              </span>
              <span className="num text-sm font-semibold text-slate-900 dark:text-slate-100">
                {fmtUsd(assetUsd)}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (assetUsd / BAR_MAX) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                Haircut <span className="num text-slate-700 dark:text-slate-300">{haircutPct}%</span> · adj{" "}
                <span className="num text-slate-700 dark:text-slate-300">
                  {fmtUsd(assetUsd * asset.haircut, 0)}
                </span>
              </span>
              {swapped ? (
                <Chip tone="emerald">Swapped to USDT</Chip>
              ) : (
                <span className="num text-slate-500 dark:text-slate-400">@ {fmtNum(livePrice)}</span>
              )}
            </div>
          </div>

          {/* USDT leg */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="num font-semibold text-slate-900 dark:text-slate-100">USDT</span>
                <span className="text-slate-500 dark:text-slate-400"> · stable reserve</span>
              </span>
              <span className="num text-sm font-semibold text-slate-900 dark:text-slate-100">
                {fmtUsd(usdtUsd)}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (usdtUsd / BAR_MAX) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                Haircut <span className="num text-slate-700 dark:text-slate-300">100%</span> · adj{" "}
                <span className="num text-slate-700 dark:text-slate-300">{fmtUsd(usdtUsd, 0)}</span>
              </span>
              <span className="num text-slate-400 dark:text-slate-500">peg 1.0000</span>
            </div>
          </div>
        </div>

        {/* ── MMR gauge ── */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Risk gauge</span>
            <Chip tone={BAND_CHIP[band.tone]}>{band.label}</Chip>
          </div>
          <MmrGauge value={snapshot.mmr} dark={dark} />
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Warning at <span className="num">85%</span>
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <Flame className="h-3 w-3" /> Liquidation at <span className="num">90%</span>
            </span>
          </div>
        </div>

        {/* ── Liquidation vector ── */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-500/20 dark:bg-rose-500/5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Liquidation threshold</div>
            <div className="num text-sm font-semibold text-rose-600 dark:text-rose-400">
              {fmtUsd(snapshot.liquidationPriceBtc, 0)}
            </div>
            <div className="num text-[10px] text-slate-500 dark:text-slate-400">
              BTC now {fmtNum(snapshot.markBtc, 0)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Distance to liquidation</div>
            <div className="num text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {fmtPct(snapshot.liquidationBufferPct, 1)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">buffer below mark</div>
          </div>
        </div>

        {/* ── State banner ── */}
        {phase === "SECURED" && (
          <div className="row-in mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Liquidation risk neutralized — collateral fully stable-weighted
          </div>
        )}

        <div className="mt-4 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Maintenance req <span className="num text-slate-700 dark:text-slate-300">{fmtUsd(snapshot.maintenanceMarginUsd, 0)}</span> ·
          haircut <span className="num text-slate-700 dark:text-slate-300">{haircutPct}%</span> · stress overlay{" "}
          <span className="num text-slate-700 dark:text-slate-300">×{MODEL.stressOverlay.toFixed(2)}</span> · stressed collateral{" "}
          <span className="num text-slate-700 dark:text-slate-300">{fmtUsd(snapshot.stressedCollateralUsd, 0)}</span>
        </div>
      </div>
    </HudPanel>
  );
}
