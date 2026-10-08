"use client";

import { useEffect, useState } from "react";
import { useRiskEngine } from "@/hooks/useRiskEngine";
import { Sidebar, type ViewId } from "@/components/Sidebar";
import { TerminalHeader, type Theme } from "@/components/TerminalHeader";
import { TickerTape } from "@/components/TickerTape";
import { MarginPanel } from "@/components/MarginPanel";
import { ThreatPanel } from "@/components/ThreatPanel";
import { MarketView } from "@/components/MarketView";
import { LedgerView } from "@/components/LedgerView";
import { EmergencyOverlay } from "@/components/EmergencyOverlay";

export default function Page() {
  const e = useRiskEngine();
  const [view, setView] = useState<ViewId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");

  // Restore persisted theme; default is light.
  useEffect(() => {
    const saved = window.localStorage.getItem("aegis-theme");
    if (saved === "dark") {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setThemeState((t) => {
      const next: Theme = t === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("aegis-theme", next);
      return next;
    });
  };

  const dark = theme === "dark";
  const chartMarkers = e.hedgeMarkers.filter((m) => m.asset === e.selectedAsset);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        view={view}
        phase={e.phase}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(v) => {
          setView(v);
          setSidebarOpen(false);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TerminalHeader
          view={view}
          latencyMs={e.latencyMs}
          busy={e.busy}
          onReset={e.reset}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <TickerTape btc={e.btcMark} prices={e.prices} mmr={e.snapshot.mmr} phase={e.phase} />

        <main key={view} className="row-in mx-auto w-full max-w-[1500px] flex-1 space-y-6 p-4 sm:p-6">
          {view === "dashboard" && (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
              <MarginPanel
                snapshot={e.snapshot}
                collateral={e.collateral}
                phase={e.phase}
                asset={e.assetMeta}
                livePrice={e.activePrice}
                busy={e.busy}
                onSelectAsset={e.setSelectedAsset}
                dark={dark}
              />
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
                dark={dark}
              />
            </div>
          )}

          {view === "analytics" && (
            <MarketView
              prices={e.prices}
              selectedAsset={e.selectedAsset}
              markers={e.hedgeMarkers}
              dark={dark}
              onSetCollateral={(a) => {
                e.setSelectedAsset(a);
                setView("dashboard");
              }}
            />
          )}

          {view === "ledger" && (
            <LedgerView tickets={e.tickets} persistence={e.persistence} />
          )}
        </main>
      </div>

      <EmergencyOverlay flash={e.flash} phase={e.phase} steps={e.defenseSteps} />
    </div>
  );
}
