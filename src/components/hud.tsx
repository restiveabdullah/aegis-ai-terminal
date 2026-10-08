"use client";

import type { ReactNode } from "react";

export type Tone = "emerald" | "amber" | "rose" | "sky" | "slate" | "indigo";

const CHIP: Record<Tone, string> = {
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300",
  slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function Chip({
  tone = "slate",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "emerald", ping = false }: { tone?: Tone; ping?: boolean }) {
  const dot: Record<Tone, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    indigo: "bg-indigo-500",
    slate: "bg-slate-400",
  };
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      {ping && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot[tone]}`} />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
    </span>
  );
}

export function HudPanel({
  tag,
  title,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  tag: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`aegis-panel flex min-h-0 flex-col overflow-hidden ${className}`}>
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-semibold text-slate-900 dark:text-slate-100">{tag}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">{right}</div>
      </header>
      <div className={`aegis-scroll min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
