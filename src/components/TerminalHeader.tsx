"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, RotateCcw, X } from "lucide-react";
import { Dot, type Tone } from "./hud";

function isNasdaqOpen(d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return mins >= 13 * 60 + 30 && mins < 20 * 60; // 13:30–20:00 UTC
}

function utcStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC · ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Bespoke isometric geometric shield with indigo→violet gradient facets. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
      <defs>
        <linearGradient id="aegis-left" x1="5" y1="9" x2="18" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      {/* top facet */}
      <path d="M18 3 L31 9.5 L18 16 L5 9.5 Z" fill="#818CF8" />
      {/* left facet */}
      <path d="M5 9.5 L18 16 L18 33 L5 25.5 Z" fill="url(#aegis-left)" />
      {/* right facet */}
      <path d="M31 9.5 L18 16 L18 33 L31 25.5 Z" fill="#6D28D9" />
      {/* check ridge */}
      <path
        d="M12.5 21 L16.5 25 L23.5 15.5"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Pill({ tone = "slate", ping = false, children }: { tone?: Tone; ping?: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
      <Dot tone={tone} ping={ping} />
      {children}
    </span>
  );
}

export function TerminalHeader({
  latencyMs,
  busy,
  onReset,
}: {
  latencyMs: number;
  busy: boolean;
  onReset: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nasdaqOpen = now ? isNasdaqOpen(now) : false;

  const telemetry = (
    <>
      <Pill tone={latencyMs < 42 ? "emerald" : "amber"} ping>
        Latency <span className="num text-slate-900">{latencyMs}ms</span>
      </Pill>
      <Pill tone="emerald">Qwen 3 80B Engine · Active</Pill>
      <Pill tone="emerald">Bitget UTA · Connected</Pill>
      <Pill tone={nasdaqOpen ? "emerald" : "rose"}>
        Nasdaq · {nasdaqOpen ? "Open" : "Closed"}
      </Pill>
      <Pill tone="indigo">24/7 Tokenized Equities Active</Pill>
      <span className="num inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
        {now ? utcStamp(now) : "—:—:— UTC"}
      </span>
    </>
  );

  return (
    <header className="aegis-panel relative flex min-h-16 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <div className="leading-tight">
          <div className="flex items-center">
            <span className="text-lg font-bold tracking-tight text-slate-900">AEGIS</span>
            <span className="ml-1.5 rounded bg-gradient-to-r from-indigo-600 to-violet-600 px-1.5 py-0.5 text-xs font-bold text-white">
              AI
            </span>
            <Dot tone="emerald" ping />
          </div>
          <div className="text-[11px] font-medium text-slate-500">Bitget Risk Core v2.4</div>
        </div>
      </div>

      {/* Desktop telemetry */}
      <div className="ml-auto hidden flex-wrap items-center gap-1.5 lg:flex">
        {telemetry}
        <button
          onClick={onReset}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset engine
        </button>
      </div>

      {/* Mobile controls */}
      <div className="ml-auto flex items-center gap-1.5 lg:hidden">
        <button
          onClick={onReset}
          disabled={busy}
          aria-label="Reset engine"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDrawer((o) => !o)}
          aria-label="Toggle telemetry"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          {drawer ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/15 lg:hidden" onClick={() => setDrawer(false)} />
          <div className="row-in absolute right-3 top-[calc(100%+6px)] z-50 flex w-72 flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xl lg:hidden">
            {telemetry}
          </div>
        </>
      )}
    </header>
  );
}
