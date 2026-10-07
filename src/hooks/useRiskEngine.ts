"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalyzeRiskResponse,
  AssetKey,
  CollateralState,
  DefenseStep,
  EnginePhase,
  LedgerTicket,
  RebalanceResponse,
  RiskAssessment,
} from "@/lib/risk-types";
import {
  ASSETS,
  ASSET_LIST,
  MODEL,
  computeMarginSnapshot,
  fmtUsd,
  fmtNum,
} from "@/lib/risk-model";
import { buildSeedTickets } from "@/lib/tickets";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface ScenarioPreset {
  id: string;
  tag: string;
  tone: "rose" | "amber" | "emerald";
  headline: string;
}

/** Bespoke, company-calibrated shock scenarios per collateral asset. */
const PRESET_HEADLINES: Record<AssetKey, { p1: string; p2: string; p3: string }> = {
  rAAPL: {
    p1: "US Department of Justice launches antitrust action against Apple hardware supply chain; production halted across 4 facilities.",
    p2: "Apple Q3 iPhone shipments in China drop 8% YoY amid localized competition.",
    p3: "Apple announces $110B accelerated share repurchase program and raises dividend.",
  },
  rNVDA: {
    p1: "US Commerce Department expands export controls on Nvidia flagship data-center GPUs; all shipments to key Asian markets suspended effective immediately.",
    p2: "Nvidia Q3 data-center GPU shipments in China drop 8% YoY amid localized competition.",
    p3: "Nvidia announces $110B accelerated share repurchase program and raises dividend.",
  },
  rTSLA: {
    p1: "NHTSA opens formal autonomous-driving safety probe covering 2.4M Tesla vehicles; fleet-wide software recall ordered pending investigation.",
    p2: "Tesla Q3 Model Y registrations in China drop 8% YoY amid localized competition.",
    p3: "Tesla announces $110B accelerated share repurchase program and raises dividend.",
  },
  rMSFT: {
    p1: "Microsoft Azure suffers catastrophic multi-region outage; 31 availability zones degraded and enterprise SLAs breached across US and EU.",
    p2: "Microsoft Q3 Azure workload growth in China drops 8% YoY amid localized competition.",
    p3: "Microsoft announces $110B accelerated share repurchase program and raises dividend.",
  },
  rAMZN: {
    p1: "FTC secures emergency injunction against Amazon logistics network; 4 fulfillment regions ordered to halt operations pending antitrust review.",
    p2: "Amazon Q3 fulfillment unit volume in China drops 8% YoY amid localized competition.",
    p3: "Amazon announces $110B accelerated share repurchase program and raises dividend.",
  },
  rGOOGL: {
    p1: "US Department of Justice wins search monopoly ruling against Alphabet; court orders immediate structural separation of the ads business.",
    p2: "Alphabet Q3 search ad volume in China-linked APAC drops 8% YoY amid localized competition.",
    p3: "Alphabet announces $110B accelerated share repurchase program and raises dividend.",
  },
};

function buildPresets(asset: AssetKey): ScenarioPreset[] {
  const h = PRESET_HEADLINES[asset];
  return [
    { id: "p1", tag: "Catastrophic", tone: "rose", headline: h.p1 },
    { id: "p2", tag: "Moderate", tone: "amber", headline: h.p2 },
    { id: "p3", tag: "Bullish / Neutral", tone: "emerald", headline: h.p3 },
  ];
}

export interface HedgeMarker {
  asset: AssetKey;
  time: number; // unix seconds, matches chart candle time
  text: string;
}

const BASE_COLLATERAL: CollateralState = {
  assetUsd: MODEL.baselineAssetUsd,
  usdtUsd: MODEL.baselineUsdtUsd,
};

function initialPrices(): Record<AssetKey, number> {
  return {
    rAAPL: ASSETS.rAAPL.refPrice,
    rNVDA: ASSETS.rNVDA.refPrice,
    rTSLA: ASSETS.rTSLA.refPrice,
    rMSFT: ASSETS.rMSFT.refPrice,
    rAMZN: ASSETS.rAMZN.refPrice,
    rGOOGL: ASSETS.rGOOGL.refPrice,
  };
}

export function useRiskEngine() {
  const [phase, setPhase] = useState<EnginePhase>("IDLE");
  const [selectedAsset, setSelectedAssetState] = useState<AssetKey>("rAAPL");
  const [collateral, setCollateral] = useState<CollateralState>(BASE_COLLATERAL);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [engineMeta, setEngineMeta] = useState<AnalyzeRiskResponse["meta"] | null>(null);
  const [tickets, setTickets] = useState<LedgerTicket[]>([]);
  const [persistence, setPersistence] = useState<"POSTGRES" | "OFFLINE">("POSTGRES");
  const [defenseSteps, setDefenseSteps] = useState<DefenseStep[]>([]);
  const [flash, setFlash] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState("Engine online · deterministic risk core v2.4");
  const [hedgeMarkers, setHedgeMarkers] = useState<HedgeMarker[]>([]);

  const [selected, setSelected] = useState<string>("p1");
  const [customHeadline, setCustomHeadline] = useState("");

  const [btcMark, setBtcMark] = useState<number>(MODEL.baselineBtcMark);
  const [prices, setPrices] = useState<Record<AssetKey, number>>(initialPrices);
  const [latencyMs, setLatencyMs] = useState(34);

  const collateralRef = useRef(collateral);
  collateralRef.current = collateral;
  const assetRef = useRef(selectedAsset);
  assetRef.current = selectedAsset;
  const driftTargets = useRef<Partial<Record<AssetKey, number>>>({});

  const presets = useMemo(() => buildPresets(selectedAsset), [selectedAsset]);
  const assetMeta = ASSETS[selectedAsset];
  const activePrice = prices[selectedAsset];

  const setStep = useCallback((idx: number, state: DefenseStep["state"]) => {
    setDefenseSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, state } : s)));
  }, []);

  // ── Boot: hydrate audit ledger ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ledger", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setTickets(data.tickets);
          setPersistence(data.persistence);
        } else {
          throw new Error("ledger read failed");
        }
      } catch {
        if (cancelled) return;
        setTickets(buildSeedTickets());
        setPersistence("OFFLINE");
        setStatusLine("Ledger store unreachable — local seed replay");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Market telemetry loops ────────────────────────────────────────────────
  useEffect(() => {
    const mkt = setInterval(() => {
      setBtcMark((m) => {
        const next = m + (Math.random() - 0.5) * 84;
        return r2(Math.min(66_460, Math.max(65_560, next)));
      });
      setPrices((prev) => {
        const next = { ...prev };
        for (const meta of ASSET_LIST) {
          const t = driftTargets.current[meta.key];
          const p = prev[meta.key];
          if (t != null) {
            next[meta.key] = r2(p + (t - p) * 0.14 + (Math.random() - 0.5) * p * 0.001);
          } else {
            const jittered = p + (Math.random() - 0.5) * meta.refPrice * 0.003;
            const lo = meta.refPrice * 0.994;
            const hi = meta.refPrice * 1.006;
            next[meta.key] = r2(Math.min(hi, Math.max(lo, jittered)));
          }
        }
        return next;
      });
    }, 1600);
    const lat = setInterval(() => setLatencyMs(Math.round(27 + Math.random() * 14)), 2400);
    return () => {
      clearInterval(mkt);
      clearInterval(lat);
    };
  }, []);

  // ── Swap execution ────────────────────────────────────────────────────────
  const executeSwap = useCallback(
    async (a: RiskAssessment | null, auto: boolean) => {
      const asset = assetRef.current;
      const meta = ASSETS[asset];
      const amount = collateralRef.current.assetUsd;
      if (amount <= 0) {
        setStatusLine(`No ${asset} exposure remaining — defense complete, standing by`);
        setPhase("SECURED");
        await sleep(1600);
        setFlash(false);
        return;
      }
      setPhase("SWAPPING");
      setStatusLine(`Executing ${asset} → USDT collateral swap on Bitget spot…`);
      const savedUsd = (Math.abs(a?.projected_equity_drawdown_pct ?? 0) / 100) * amount;
      try {
        const res = await fetch("/api/rebalance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetFrom: asset,
            assetTo: "USDT",
            amountUsd: r2(amount),
            savedUsd: r2(savedUsd),
          }),
        });
        const data: RebalanceResponse = await res.json();
        if (!data.ok) throw new Error("venue rejected order");
        const t = data.ticket;

        setCollateral((c) => ({ assetUsd: 0, usdtUsd: r2(c.usdtUsd + t.filledUsd) }));
        setTickets((prev) => [t, ...prev]);
        setPersistence(data.meta.persistence);
        setStatusLine(
          `Fill ${t.orderId} · ${asset} → USDT ${fmtUsd(t.filledUsd)} @ ${fmtNum(t.execPrice)} · ${t.latencyMs}ms · ${t.mode === "LIVE" ? "live" : "simulated"}`,
        );
        setStep(2, "done");
        setStep(3, "active");
        // Chart annotation for the executed hedge (raw epoch seconds — the
        // chart aligns it to the active timeframe bucket).
        const execSec = Math.floor(Date.now() / 1000);
        setHedgeMarkers((prev) => [
          ...prev.filter((m) => !(m.asset === asset && m.time === execSec)),
          {
            asset,
            time: execSec,
            text: auto ? "Auto-Hedge Executed" : "Operator Hedge Executed",
          },
        ]);
        // Contamination propagates through the equity leg after we exit.
        driftTargets.current[asset] = r2(meta.refPrice * 0.935);
        await sleep(650);
        setStep(3, "done");
        setPhase("SECURED");
        await sleep(2600);
        setFlash(false);
      } catch {
        setErrorMsg("Rebalance route fault — order not confirmed. Retry the collateral swap.");
        setStep(2, "pending");
        setFlash(false);
        setPhase("ASSESSED");
      }
    },
    [setStep],
  );

  // ── Auto-defense choreography ─────────────────────────────────────────────
  const triggerDefense = useCallback(
    async (a: RiskAssessment) => {
      const asset = assetRef.current;
      setPhase("DEFENSE");
      setFlash(true);
      setDefenseSteps([
        { label: `Threat confirmed — ${asset} collateral contaminated`, state: "active" },
        { label: `Collateral swap authorized — ${asset} → USDT`, state: "pending" },
        { label: "Bitget spot route — executing fill", state: "pending" },
        { label: "Audit ledger signed — risk neutralized", state: "pending" },
      ]);
      setStatusLine("Collateral contamination detected — auto-defense triggered");
      await sleep(750);
      setStep(0, "done");
      setStep(1, "active");
      await sleep(650);
      setStep(1, "done");
      setStep(2, "active");
      await executeSwap(a, true);
    },
    [executeSwap, setStep],
  );

  // ── Primary action: analyze collateral stress ────────────────────────────
  const busy = phase === "ANALYZING" || phase === "DEFENSE" || phase === "SWAPPING";

  const analyze = useCallback(async () => {
    if (busy) return;
    const preset = presets.find((p) => p.id === selected);
    const headline = selected === "custom" ? customHeadline.trim() : preset?.headline ?? "";
    if (!headline || headline.length < 8) {
      setErrorMsg("Add a headline first — select a preset or write a custom wire (min 8 chars).");
      return;
    }
    const asset = assetRef.current;
    setErrorMsg(null);
    setPhase("ANALYZING");
    setAssessment(null);
    setEngineMeta(null);
    setStatusLine(`Qwen 3 evaluating collateral stress on ${asset}…`);
    try {
      const res = await fetch("/api/analyze-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, asset }),
      });
      const data: AnalyzeRiskResponse = await res.json();
      if (!data.ok) throw new Error("engine rejected payload");
      const a = data.assessment;
      setAssessment(a);
      setEngineMeta(data.meta);
      setPhase("ASSESSED");
      setStatusLine(
        `Verdict ${a.threat_level} · ΔEQ ${a.projected_equity_drawdown_pct}% · P(MC) ${a.margin_call_probability}% · ${data.meta.path.toLowerCase()} ${data.meta.latencyMs}ms`,
      );
      if (
        a.threat_level === "CRITICAL" &&
        a.recommendation === "EMERGENCY_DELEVERAGE_COLLATERAL" &&
        collateralRef.current.assetUsd > 0
      ) {
        await sleep(1000);
        await triggerDefense(a);
      }
    } catch {
      setPhase("IDLE");
      setErrorMsg("Analysis uplink fault — CRO engine unreachable. Retry when telemetry recovers.");
      setStatusLine("Analysis uplink fault — retry available");
    }
  }, [busy, presets, selected, customHeadline, triggerDefense]);

  // Manual preemptive swap (for ELEVATED verdicts or operator override).
  const manualSwap = useCallback(async () => {
    if (busy || collateralRef.current.assetUsd <= 0) return;
    const asset = assetRef.current;
    setErrorMsg(null);
    setDefenseSteps([
      { label: "Operator override — preemptive collateral swap", state: "done" },
      { label: `Collateral swap authorized — ${asset} → USDT`, state: "done" },
      { label: "Bitget spot route — executing fill", state: "active" },
      { label: "Audit ledger signed — risk neutralized", state: "pending" },
    ]);
    setStatusLine(`Operator override — preemptive ${asset} → USDT swap requested`);
    await executeSwap(assessment, false);
  }, [assessment, busy, executeSwap]);

  const setSelectedAsset = useCallback(
    (a: AssetKey) => {
      if (busy || a === assetRef.current) return;
      setSelectedAssetState(a);
      setCollateral(BASE_COLLATERAL);
      setPhase("IDLE");
      setAssessment(null);
      setEngineMeta(null);
      setErrorMsg(null);
      delete driftTargets.current[a];
      setStatusLine(`Active collateral switched to ${a} · sleeve baseline restored`);
    },
    [busy],
  );

  const reset = useCallback(() => {
    driftTargets.current = {};
    setCollateral(BASE_COLLATERAL);
    setPhase("IDLE");
    setAssessment(null);
    setEngineMeta(null);
    setDefenseSteps([]);
    setFlash(false);
    setErrorMsg(null);
    setHedgeMarkers([]);
    setBtcMark(MODEL.baselineBtcMark);
    setPrices(initialPrices());
    setStatusLine("Engine state reset · baseline collateral restored");
  }, []);

  const snapshot = useMemo(
    () => computeMarginSnapshot(collateral, btcMark, assetMeta.haircut),
    [collateral, btcMark, assetMeta.haircut],
  );

  return {
    phase,
    busy,
    selectedAsset,
    setSelectedAsset,
    assetMeta,
    activePrice,
    prices,
    presets,
    collateral,
    assessment,
    engineMeta,
    tickets,
    persistence,
    defenseSteps,
    flash,
    errorMsg,
    statusLine,
    hedgeMarkers,
    selected,
    setSelected,
    customHeadline,
    setCustomHeadline,
    btcMark,
    latencyMs,
    snapshot,
    analyze,
    manualSwap,
    reset,
    trunc,
  };
}

export type RiskEngine = ReturnType<typeof useRiskEngine>;
