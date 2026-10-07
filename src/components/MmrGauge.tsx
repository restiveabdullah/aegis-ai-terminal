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

const TONE: Record<string, { stroke: string; text: string }> = {
  optimal: { stroke: "#059669", text: "#059669" },
  elevated: { stroke: "#65a30d", text: "#65a30d" },
  warning: { stroke: "#d97706", text: "#d97706" },
  liquidation: { stroke: "#e11d48", text: "#e11d48" },
};

export function MmrGauge({ value }: { value: number }) {
  const v = useTweenedNumber(value, 1200);
  const band = mmrBand(v);
  const tone = TONE[band.tone];
  const needle = polar(angleFor(v), R - 18);

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
        stroke={tv >= 0.85 ? "#fda4af" : major ? "#cbd5e1" : "#e2e8f0"}
        strokeWidth={major ? 1.4 : 0.8}
      />,
    );
  }

  const warnP = polar(angleFor(0.85), R + 24);
  const liqP = polar(angleFor(0.93), R + 24);

  return (
    <div className="relative mx-auto w-full max-w-[250px]">
      <svg viewBox="0 0 220 182" className="w-full">
        {/* base track: slate-200 */}
        <path d={arcPath(0, 1, R)} fill="none" stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" />
        {/* zone tints: amber warning segment, rose liquidation segment */}
        <path d={arcPath(0.7, 0.85, R)} fill="none" stroke="#fcd34d" strokeOpacity="0.45" strokeWidth="9" />
        <path d={arcPath(0.85, 1, R)} fill="none" stroke="#fecdd3" strokeWidth="9" />
        {/* live value arc */}
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
        <text x={warnP.x} y={warnP.y} textAnchor="middle" fill="#d97706" fontSize="8" className="num">
          85
        </text>
        <text x={liqP.x} y={liqP.y} textAnchor="middle" fill="#e11d48" fontSize="8" className="num">
          90
        </text>
        {/* needle */}
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
        <circle cx={CX} cy={CY} r="4.5" fill="#ffffff" stroke={tone.stroke} strokeWidth="1.6" />
        {/* center readout */}
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
        <text x={CX} y={CY + 46} textAnchor="middle" fontSize="9" fill="#64748b">
          Maintenance margin ratio
        </text>
      </svg>
    </div>
  );
}
