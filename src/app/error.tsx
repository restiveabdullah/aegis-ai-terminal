"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="aegis-panel w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50">
            <TriangleAlert className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Terminal fault — render pipeline interrupted
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              The Aegis watchdog caught an unhandled exception
            </div>
          </div>
        </div>
        <div className="num mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {error.message || "unknown fault"}
          {error.digest && <div className="mt-1 text-slate-400">digest · {error.digest}</div>}
        </div>
        <button
          onClick={reset}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <RotateCcw className="h-4 w-4" />
          Re-initialize terminal
        </button>
      </div>
    </div>
  );
}
