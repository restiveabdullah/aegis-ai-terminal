"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { AssetKey } from "@/lib/risk-types";
import { ASSETS, fmtNum, fmtSignedPct, type AssetMeta } from "@/lib/risk-model";
import type { HedgeMarker } from "@/hooks/useRiskEngine";
import { Chip } from "./hud";
import { CollateralChart } from "./CollateralChart";

export function MarketView({
  prices,
  selectedAsset,
  markers,
  dark,
  onSetCollateral,
}: {
  prices: Record<AssetKey, number>;
  selectedAsset: AssetKey;
  markers: HedgeMarker[];
  dark: boolean;
  onSetCollateral: (a: AssetKey) => void;
}) {
  const [symbol, setSymbol] = useState<AssetKey>(selectedAsset);

  // Follow the global collateral selection when it changes elsewhere.
  useEffect(() => {
    setSymbol(selectedAsset);
  }, [selectedAsset]);

  const chartAsset = ASSETS[symbol];
  const chartMarkers = markers.filter((m) => m.asset === symbol);

  return (
    <div className="space-y-6">
      {/* Expanded chart */}
      <CollateralChart
        asset={chartAsset}
        livePrice={prices[symbol]}
        markers={chartMarkers}
        dark={dark}
        heightClass="h-[380px]"
      />

      {/* Full tokenized equities coverage */}
      <div className="aegis-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Tokenized equities coverage
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              Bitget multi-asset margin universe
            </span>
          </div>
          <Chip tone="indigo">24/7 markets</Chip>
        </div>
        <div className="aegis-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <th className="py-2.5 pl-5 pr-3">Asset</th>
                <th className="py-2.5 pr-3">Sector</th>
                <th className="py-2.5 pr-3">Live price</th>
                <th className="py-2.5 pr-3">Session Δ</th>
                <th className="py-2.5 pr-3">Reference</th>
                <th className="py-2.5 pr-3">Haircut</th>
                <th className="py-2.5 pr-3">Margin weight</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Collateral action</th>
              </tr>
            </thead>
            <tbody>
              {(Object.values(ASSETS) as AssetMeta[]).map((a) => {
                const px = prices[a.key];
                const delta = ((px - a.refPrice) / a.refPrice) * 100;
                const up = delta >= 0;
                const isActive = a.key === selectedAsset;
                const isCharted = a.key === symbol;
                return (
                  <tr
                    key={a.key}
                    onClick={() => setSymbol(a.key)}
                    className={`cursor-pointer border-b border-slate-100 text-xs transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 ${
                      isCharted ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""
                    }`}
                  >
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`num flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-bold ${
                            isCharted
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {a.symbol.replace("r", "")}
                        </span>
                        <div>
                          <div className="num font-semibold text-slate-900 dark:text-slate-100">
                            {a.symbol}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {a.company}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <Chip tone="slate">{a.sector}</Chip>
                    </td>
                    <td className="num py-3 pr-3 font-semibold text-slate-900 dark:text-slate-100">
                      {fmtNum(px)}
                    </td>
                    <td
                      className={`num py-3 pr-3 font-medium ${
                        up
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {fmtSignedPct(delta)}
                    </td>
                    <td className="num py-3 pr-3 text-slate-500 dark:text-slate-400">
                      {fmtNum(a.refPrice)}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="num rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {Math.round(a.haircut * 100)}%
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="h-1.5 w-20 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${a.haircut * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      {isActive ? (
                        <Chip tone="emerald">Active collateral</Chip>
                      ) : (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSetCollateral(a.key);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100/70 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Set as collateral
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
