"use client";

import {
  Activity,
  LayoutDashboard,
  LineChart,
  ScrollText,
  X,
  type LucideIcon,
} from "lucide-react";
import type { EnginePhase } from "@/lib/risk-types";
import { Chip } from "./hud";
import { LogoMark } from "./TerminalHeader";

export type ViewId = "dashboard" | "analytics" | "ledger";

export const VIEWS: { id: ViewId; label: string; subtitle: string; icon: LucideIcon }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Risk engine & margin control",
    icon: LayoutDashboard,
  },
  {
    id: "analytics",
    label: "Market Analytics",
    subtitle: "Tokenized equities & charts",
    icon: LineChart,
  },
  {
    id: "ledger",
    label: "Audit Ledger",
    subtitle: "Execution tickets & history",
    icon: ScrollText,
  },
];

function phaseChip(phase: EnginePhase): { label: string; tone: "emerald" | "amber" | "rose" | "slate" } {
  switch (phase) {
    case "SECURED":
      return { label: "Secured", tone: "emerald" };
    case "IDLE":
      return { label: "Monitoring", tone: "emerald" };
    case "ASSESSED":
      return { label: "Assessed", tone: "amber" };
    default:
      return { label: "Defending", tone: "rose" };
  }
}

function SidebarBody({
  view,
  onNavigate,
  phase,
}: {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  phase: EnginePhase;
}) {
  const chip = phaseChip(phase);
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark size={32} />
        <div className="leading-tight">
          <div className="flex items-center">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              AEGIS
            </span>
            <span className="ml-1.5 rounded bg-gradient-to-r from-indigo-600 to-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              AI
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Bitget Risk Core v2.4
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex-1 space-y-1 px-3">
        <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Workspace
        </div>
        {VIEWS.map((v) => {
          const active = view === v.id;
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => onNavigate(v.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}
                strokeWidth={1.9}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{v.label}</span>
                <span
                  className={`block truncate text-[11px] ${
                    active ? "text-indigo-500/80 dark:text-indigo-300/60" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {v.subtitle}
                </span>
              </span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />}
            </button>
          );
        })}
      </nav>

      {/* Engine status card */}
      <div className="mx-3 mb-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            Engine status
          </span>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Autonomous collateral defense for Bitget UTA multi-asset margin mode.
        </p>
      </div>
      <div className="px-5 pb-4 text-[10px] text-slate-400 dark:text-slate-600">
        © 2026 Aegis Systems · v2.4.118
      </div>
    </div>
  );
}

export function Sidebar({
  view,
  onNavigate,
  phase,
  open,
  onClose,
}: {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  phase: EnginePhase;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <SidebarBody view={view} onNavigate={onNavigate} phase={phase} />
      </aside>

      {/* Mobile off-canvas */}
      <div
        className={`fixed inset-0 z-50 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
        <aside
          className={`absolute inset-y-0 left-0 w-72 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarBody view={view} onNavigate={onNavigate} phase={phase} />
        </aside>
      </div>
    </>
  );
}
