"use client";

import { ShieldCheck } from "lucide-react";
import { useRiskEngine } from "@/hooks/useRiskEngine";
import { TerminalHeader, LogoMark } from "@/components/TerminalHeader";
import { TickerTape } from "@/components/TickerTape";
import { MarginPanel } from "@/components/MarginPanel";
import { ThreatPanel } from "@/components/ThreatPanel";
import { LedgerPanel } from "@/components/LedgerPanel";
import { EmergencyOverlay } from "@/components/EmergencyOverlay";
import { Chip, Dot } from "@/components/hud";

export default function Page() {
  const e = useRiskEngine();
  const chartMarkers = e.hedgeMarkers.filter((m) => m.asset === e.selectedAsset);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-2.5 p-3 lg:h-screen lg:min-h-0">
      <TerminalHeader latencyMs={e.latencyMs} busy={e.busy} onReset={e.reset} />
      <TickerTape btc={e.btcMark} prices={e.prices} mmr={e.snapshot.mmr} phase={e.phase} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-12">
        <div className="min-h-[600px] lg:col-span-4 lg:min-h-0">
          <MarginPanel
            snapshot={e.snapshot}
            collateral={e.collateral}
            phase={e.phase}
            asset={e.assetMeta}
            livePrice={e.activePrice}
            busy={e.busy}
            onSelectAsset={e.setSelectedAsset}
          />
        </div>
        <div className="min-h-[760px] lg:col-span-4 lg:min-h-0">
          <ThreatPanel
            phase={e.phase}
            busy={e.busy}
            asset={e.assetMeta}
            livePrice={e.activePrice}
            markers={chartMarkers}
            presets={e.presets}
            selected={e.selected}
            setSelected={e.setSelected}
            customHeadline={e.customHeadline}
            setCustomHeadline={e.setCustomHeadline}
            assessment={e.assessment}
            engineMeta={e.engineMeta}
            errorMsg={e.errorMsg}
            statusLine={e.statusLine}
            assetRemaining={e.collateral.assetUsd}
            onAnalyze={e.analyze}
            onManualSwap={e.manualSwap}
          />
        </div>
        <div className="min-h-[440px] lg:col-span-4 lg:min-h-0">
          <LedgerPanel tickets={e.tickets} persistence={e.persistence} />
        </div>
      </main>

      {/* Modern SaaS footer */}
      <footer className="aegis-panel grid shrink-0 grid-cols-1 items-center gap-x-6 gap-y-2 px-4 py-2.5 text-[11px] text-slate-500 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <LogoMark size={18} />
          <span className="font-semibold text-slate-700">Aegis AI</span>
          <span className="text-slate-400">Engineered for Bitget UTA Multi-Asset Mode</span>
          <span className="hidden items-center gap-1 xl:flex">
            <Dot tone="emerald" ping />
            <span className="text-emerald-600">Operational</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 md:justify-center">
          <Chip tone="slate">Qwen 3 80B Instruct · temp <span className="num">0.10</span> · strict JSON</Chip>
          <Chip tone="slate">Bitget Spot v2 · CCXT gateway</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:justify-end">
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Append-only audit trail verified
          </span>
          <span>© 2026 Aegis Systems · Terms · Privacy</span>
        </div>
      </footer>

      <EmergencyOverlay flash={e.flash} phase={e.phase} steps={e.defenseSteps} />
    </div>
  );
}
