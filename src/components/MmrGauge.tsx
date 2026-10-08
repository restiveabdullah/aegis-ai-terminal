"use client";

import { mmrBand } from "@/lib/risk-model";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";

const CX = 110;
const CY = 112;
const R = 84;

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

const START = -212;
const SWEEP = 244;

function angleFor(v: number): number {
  return START + Math.min(1.02, Math.max(0, v)) * SWEEP;
}

function arcPath(v0: number, v1: number, r: number): string {
  const a0 = angleFor(v0);
  const a1 = angleFor(v1);
  const p0 = polar(a0, r);
  const p1 = polar(a1, r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

interface ToneDef {
  stroke: string;
  text: string;
}

const TONE_LIGHT: Record<string, ToneDef> = {
  optimal: { stroke: "#059669", text: "#059669" },
  elevated: { stroke: "#65a30d", text: "#65a30d" },
  warning: { stroke: "#d97706", text: "#d97706" },
  liquidation: { stroke: "#e11d48", text: "#e11d48" },
};

const TONE_DARK: Record<string, ToneDef> = {
  optimal: { stroke: "#10b981", text: "#34d399" },
  elevated: { stroke: "#a3e635", text: "#bef264" },
  warning: { stroke: "#f59e0b", text: "#fbbf24" },
  liquidation: { stroke: "#fb4d63", text: "#fb7185" },
};

export function MmrGauge({ value, dark = false }: { value: number; dark?: boolean }) {
  const v = useTweenedNumber(value, 1200);
  const band = mmrBand(v);
  const tone = (dark ? TONE_DARK : TONE_LIGHT)[band.tone];
  const needle = polar(angleFor(v), R - 18);

  const track = dark ? "#1e293b" : "#e2e8f0";
  const warnZone = dark ? "rgba(245,158,11,0.28)" : "rgba(252,211,77,0.55)";
  const liqZone = dark ? "rgba(244,63,94,0.22)" : "#fecdd3";
  const tickMinor = dark ? "#1e293b" : "#e2e8f0";
  const tickMajor = dark ? "#334155" : "#cbd5e1";
  const tickDanger = dark ? "#7f1d2b" : "#fda4af";
  const hubFill = dark ? "#0f172a" : "#ffffff";
  const labelFill = dark ? "#64748b" : "#64748b";
  const warnText = dark ? "#fbbf24" : "#d97706";
  const liqText = dark ? "#fb7185" : "#e11d48";

  const ticks = [];
  for (let i = 0; i <= 40; i++) {
    const tv = i / 40;
    const major = i % 8 === 0;
    const a = angleFor(tv);
    const p0 = polar(a, R + 7);
    const p1 = polar(a, R + (major ? 13 : 10));
    ticks.push(
      <line
        key={i}
        x1={p0.x}
        y1={p0.y}
        x2={p1.x}
        y2={p1.y}
        stroke={tv >= 0.85 ? tickDanger : major ? tickMajor : tickMinor}
        strokeWidth={major ? 1.4 : 0.8}
      />,
    );
  }

  const warnP = polar(angleFor(0.85), R + 24);
  const liqP = polar(angleFor(0.93), R + 24);

  return (
    <div className="relative mx-auto w-full max-w-[250px]">
      <svg viewBox="0 0 220 182" className="w-full">
        <path d={arcPath(0, 1, R)} fill="none" stroke={track} strokeWidth="9" strokeLinecap="round" />
        <path d={arcPath(0.7, 0.85, R)} fill="none" stroke={warnZone} strokeWidth="9" />
        <path d={arcPath(0.85, 1, R)} fill="none" stroke={liqZone} strokeWidth="9" />
        {v > 0.001 && (
          <path
            d={arcPath(0, Math.min(v, 1), R)}
            fill="none"
            stroke={tone.stroke}
            strokeWidth="9"
            strokeLinecap="round"
            style={{ transition: "stroke 500ms" }}
          />
        )}
        {ticks}
        <text x={warnP.x} y={warnP.y} textAnchor="middle" fill={warnText} fontSize="8" className="num">
          85
        </text>
        <text x={liqP.x} y={liqP.y} textAnchor="middle" fill={liqText} fontSize="8" className="num">
          90
        </text>
        <line
          x1={CX}
          y1={CY}
          x2={needle.x}
          y2={needle.y}
          stroke={tone.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transition: "stroke 500ms" }}
        />
        <circle cx={CX} cy={CY} r="4.5" fill={hubFill} stroke={tone.stroke} strokeWidth="1.6" />
        <text
          x={CX}
          y={CY + 30}
          textAnchor="middle"
          fontSize="25"
          fontWeight={700}
          fill={tone.text}
          className="num"
        >
          {(v * 100).toFixed(2)}%
        </text>
        <text x={CX} y={CY + 46} textAnchor="middle" fontSize="9" fill={labelFill}>
          Maintenance margin ratio
        </text>
      </svg>
    </div>
  );
}
