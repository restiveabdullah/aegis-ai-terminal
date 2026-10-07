"use client";

import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { DefenseStep, EnginePhase } from "@/lib/risk-types";

function StepRow({ step }: { step: DefenseStep }) {
  if (step.state === "done") {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        {step.label}
      </div>
    );
  }
  if (step.state === "active") {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
        {step.label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <CircleDashed className="h-3.5 w-3.5 shrink-0" />
      {step.label}
    </div>
  );
}

export function EmergencyOverlay({
  flash,
  phase,
  steps,
}: {
  flash: boolean;
  phase: EnginePhase;
  steps: DefenseStep[];
}) {
  if (!flash) return null;
  const secured = phase === "SECURED";

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center bg-slate-900/25 pt-16 backdrop-blur-sm">
      <div
        className={`row-in w-[min(560px,92vw)] rounded-2xl border bg-white/95 p-5 shadow-2xl backdrop-blur-md ${
          secured ? "border-emerald-200" : "border-rose-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              secured
                ? "border-emerald-200 bg-emerald-50"
                : "shield-pulse border-rose-200 bg-rose-50"
            }`}
          >
            {secured ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-rose-600" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {secured
                ? "Risk neutralized — collateral secured in USDT"
                : "Collateral contamination detected — auto-defense triggered"}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {secured
                ? "Maintenance margin re-derived inside the safe band · liquidation vector closed"
                : "Converting contaminated equity collateral to stable weighting on Bitget spot"}
            </div>
          </div>
        </div>
        {steps.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {steps.map((s) => (
              <StepRow key={s.label} step={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
