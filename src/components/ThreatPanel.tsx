"use client";

import {
  Activity,
  AlertOctagon,
  ArrowRightLeft,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type {
  AnalyzeRiskResponse,
  EnginePhase,
  RiskAssessment,
} from "@/lib/risk-types";
import { fmtSignedPct, type AssetMeta } from "@/lib/risk-model";
import type { HedgeMarker, ScenarioPreset } from "@/hooks/useRiskEngine";
import { Chip, HudPanel, type Tone } from "./hud";
import { CollateralChart } from "./CollateralChart";

const THREAT_TONE: Record<string, Tone> = {
  CRITICAL: "rose",
  ELEVATED: "amber",
  NOMINAL: "emerald",
};

function barColor(score: number): string {
  if (score >= 75) return "bg-rose-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

function FactorBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[11px] text-slate-600">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="num w-7 shrink-0 text-right text-[11px] font-semibold text-slate-700">
        {score}
      </span>
    </div>
  );
}

export function ThreatPanel({
  phase,
  busy,
  asset,
  livePrice,
  markers,
  presets,
  selected,
  setSelected,
  customHeadline,
  setCustomHeadline,
  assessment,
  engineMeta,
  errorMsg,
  statusLine,
  assetRemaining,
  onAnalyze,
  onManualSwap,
}: {
  phase: EnginePhase;
  busy: boolean;
  asset: AssetMeta;
  livePrice: number;
  markers: HedgeMarker[];
  presets: ScenarioPreset[];
  selected: string;
  setSelected: (id: string) => void;
  customHeadline: string;
  setCustomHeadline: (s: string) => void;
  assessment: RiskAssessment | null;
  engineMeta: AnalyzeRiskResponse["meta"] | null;
  errorMsg: string | null;
  statusLine: string;
  assetRemaining: number;
  onAnalyze: () => void;
  onManualSwap: () => void;
}) {
  const btnLabel =
    phase === "ANALYZING"
      ? "Analyzing with Qwen 3…"
      : phase === "DEFENSE"
        ? "Auto-defense engaged…"
        : phase === "SWAPPING"
          ? "Awaiting Bitget fill…"
          : "Analyze collateral stress with Qwen 3";

  const activeRing: Record<ScenarioPreset["tone"], string> = {
    rose: "border-rose-300 bg-rose-50/60",
    amber: "border-amber-300 bg-amber-50/60",
    emerald: "border-emerald-300 bg-emerald-50/60",
  };

  return (
    <HudPanel
      tag="Panel B"
      title="Collateral chart & risk assessor"
      right={
        <>
          <Chip tone="indigo">Qwen3 80B</Chip>
          {engineMeta && (
            <Chip tone={engineMeta.path === "OPENROUTER" ? "emerald" : "slate"}>
              {engineMeta.path === "OPENROUTER" ? "Live model" : "Fallback"} ·{" "}
              <span className="num">{engineMeta.latencyMs}ms</span>
            </Chip>
          )}
        </>
      }
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {/* Live multi-timeframe collateral chart */}
      <CollateralChart asset={asset} livePrice={livePrice} markers={markers} />

      {/* Scenario selector */}
      <div className="text-xs font-medium text-slate-600">Scenario selector</div>
      <div className="space-y-1.5">
        {presets.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              disabled={busy}
              className={`w-full rounded-lg border p-2.5 text-left transition disabled:opacity-50 ${
                active
                  ? activeRing[p.tone]
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <Chip tone={p.tone}>{p.tag}</Chip>
              <p className="mt-1.5 text-xs leading-snug text-slate-600">{p.headline}</p>
            </button>
          );
        })}
      </div>

      {/* Custom wire */}
      <div
        className={`rounded-lg border p-2.5 transition ${
          selected === "custom"
            ? "border-indigo-300 bg-indigo-50/50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <Chip tone={selected === "custom" ? "indigo" : "slate"}>Custom wire</Chip>
          <span className="num text-[11px] text-slate-400">{customHeadline.length}/500</span>
        </div>
        <textarea
          value={customHeadline}
          maxLength={500}
          rows={2}
          disabled={busy}
          onFocus={() => setSelected("custom")}
          onChange={(e) => {
            setCustomHeadline(e.target.value);
            setSelected("custom");
          }}
          placeholder={`Write a headline for the CRO engine to stress-test against ${asset.symbol} collateral…`}
          className="w-full resize-none bg-transparent text-xs leading-snug text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Analyze */}
      <button
        onClick={onAnalyze}
        disabled={busy}
        className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-wait disabled:bg-indigo-400"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" strokeWidth={2.2} />}
        {btnLabel}
      </button>

      {/* Slim status line */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Activity className={`h-3 w-3 shrink-0 ${busy ? "animate-pulse text-indigo-500" : "text-slate-400"}`} />
        <span className="truncate">{statusLine}</span>
      </div>

      {errorMsg && (
        <div className="row-in flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* CRO verdict */}
      {assessment && (
        <div
          className={`row-in rounded-lg border p-3 ${
            assessment.threat_level === "CRITICAL"
              ? "border-rose-300 bg-rose-50/60"
              : assessment.threat_level === "ELEVATED"
                ? "border-amber-300 bg-amber-50/60"
                : "border-emerald-300 bg-emerald-50/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Qwen 3 CRO verdict</span>
            {engineMeta && (
              <span className="num text-[11px] text-slate-400">{engineMeta.asset}</span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${
                assessment.threat_level === "CRITICAL"
                  ? "border-rose-200 bg-rose-50"
                  : assessment.threat_level === "ELEVATED"
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
              }`}
            >
              {assessment.threat_level === "CRITICAL" ? (
                <AlertOctagon className="h-6 w-6 animate-pulse text-rose-600" />
              ) : assessment.threat_level === "ELEVATED" ? (
                <TriangleAlert className="h-6 w-6 text-amber-500" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div className="min-w-0">
              <Chip tone={THREAT_TONE[assessment.threat_level]}>
                {assessment.threat_level.charAt(0) + assessment.threat_level.slice(1).toLowerCase()}
              </Chip>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`num text-lg font-bold leading-none ${
                    assessment.projected_equity_drawdown_pct < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {fmtSignedPct(assessment.projected_equity_drawdown_pct, 1)}
                </span>
                <span className="text-[10px] text-slate-500">projected equity move</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-[10px] text-slate-500">P(margin call)</div>
              <div className="num text-sm font-semibold text-slate-900">
                {assessment.margin_call_probability}
                <span className="text-[10px] font-normal text-slate-400"> /100</span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(assessment.margin_call_probability)}`}
                  style={{ width: `${Math.min(100, assessment.margin_call_probability)}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-[10px] text-slate-500">Recommendation</div>
              <div
                className={`mt-0.5 text-[11px] font-semibold leading-tight ${
                  assessment.recommendation === "EMERGENCY_DELEVERAGE_COLLATERAL"
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {assessment.recommendation === "EMERGENCY_DELEVERAGE_COLLATERAL"
                  ? "Emergency deleverage collateral"
                  : "Hold position"}
              </div>
            </div>
          </div>

          {/* Explainable risk factor matrix */}
          <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
            <div className="mb-2 text-[10px] font-medium text-slate-500">Risk factor matrix</div>
            <div className="space-y-1.5">
              <FactorBar label="Regulatory" score={assessment.factor_breakdown.regulatory_risk} />
              <FactorBar label="Supply chain" score={assessment.factor_breakdown.supply_chain_risk} />
              <FactorBar label="Liquidity" score={assessment.factor_breakdown.liquidity_risk} />
            </div>
          </div>

          <p className="mt-2.5 border-t border-slate-200 pt-2.5 text-xs leading-relaxed text-slate-600">
            {assessment.executive_rationale}
          </p>

          {assetRemaining > 0.01 &&
            (phase === "ASSESSED" || phase === "IDLE") &&
            assessment.recommendation === "HOLD" && (
              <button
                onClick={onManualSwap}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100/60"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Operator override — preemptive swap to USDT
              </button>
            )}
          {assessment.recommendation === "EMERGENCY_DELEVERAGE_COLLATERAL" && assetRemaining > 0.01 && (
            <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-center text-[11px] font-medium text-rose-700">
              Critical verdicts self-execute — auto-defense protocol armed
            </div>
          )}
        </div>
      )}
    </HudPanel>
  );
}
