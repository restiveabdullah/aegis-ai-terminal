"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, Moon, RotateCcw, Sun } from "lucide-react";
import { Dot, type Tone } from "./hud";
import type { ViewId } from "./Sidebar";

export type Theme = "light" | "dark";

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
      <path d="M18 3 L31 9.5 L18 16 L5 9.5 Z" fill="#818CF8" />
      <path d="M5 9.5 L18 16 L18 33 L5 25.5 Z" fill="url(#aegis-left)" />
      <path d="M31 9.5 L18 16 L18 33 L31 25.5 Z" fill="#6D28D9" />
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:shadow-none">
      <Dot tone={tone} ping={ping} />
      {children}
    </span>
  );
}

export function TerminalHeader({
  view,
  latencyMs,
  busy,
  onReset,
  theme,
  onToggleTheme,
  onOpenSidebar,
}: {
  view: ViewId;
  latencyMs: number;
  busy: boolean;
  onReset: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nasdaqOpen = now ? isNasdaqOpen(now) : false;
  const titles: Record<ViewId, { title: string; sub: string }> = {
    dashboard: { title: "Dashboard", sub: "Autonomous margin defense console" },
    analytics: { title: "Market Analytics", sub: "Tokenized equities coverage · 24/7" },
    ledger: { title: "Audit Ledger", sub: "Immutable execution ticket trail" },
  };
  const t = titles[view];

  return (
    <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white/85 px-4 py-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      {/* Mobile menu */}
      <button
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* View title */}
      <div className="leading-tight">
        <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {t.title}
        </h1>
        <p className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">{t.sub}</p>
      </div>

      {/* Telemetry */}
      <div className="ml-auto hidden flex-wrap items-center gap-1.5 xl:flex">
        <Pill tone={latencyMs < 42 ? "emerald" : "amber"} ping>
          Latency <span className="num text-slate-900 dark:text-slate-100">{latencyMs}ms</span>
        </Pill>
        <Pill tone="emerald">Qwen 3 80B · Active</Pill>
        <Pill tone="emerald">Bitget UTA · Connected</Pill>
        <Pill tone={nasdaqOpen ? "emerald" : "rose"}>
          Nasdaq · {nasdaqOpen ? "Open" : "Closed"}
        </Pill>
        <Pill tone="indigo">Tokenized Equities · 24/7</Pill>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1.5 xl:ml-3">
        <span className="num hidden items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 md:inline-flex">
          {now ? utcStamp(now) : "—:—:— UTC"}
        </span>
        <button
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <button
          onClick={onReset}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset engine</span>
        </button>
      </div>
    </header>
  );
}
