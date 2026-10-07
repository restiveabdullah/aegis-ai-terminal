"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
} from "lightweight-charts";
import type { HedgeMarker } from "@/hooks/useRiskEngine";
import { fmtNum, fmtSignedPct, type AssetMeta } from "@/lib/risk-model";
import {
  DEFAULT_TIMEFRAME,
  TIMEFRAMES,
  alignToTimeframe,
  generateOhlc,
  type OhlcBar,
  type Timeframe,
} from "@/lib/ohlc";

export function CollateralChart({
  asset,
  livePrice,
  markers,
}: {
  asset: AssetMeta;
  livePrice: number;
  markers: HedgeMarker[];
}) {
  const [tf, setTf] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastBarRef = useRef<OhlcBar | null>(null);
  const seriesStartRef = useRef<number>(0);
  const [prevClose, setPrevClose] = useState(asset.refPrice);

  // Create chart once; timeframe switches only swap series data.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontSize: 10,
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false, rightOffset: 4 },
      crosshair: {
        vertLine: { color: "#cbd5e1", labelBackgroundColor: "#4f46e5" },
        horzLine: { color: "#cbd5e1", labelBackgroundColor: "#4f46e5" },
      },
      width: el.clientWidth,
      height: el.clientHeight,
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      borderVisible: false,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "vol",
      priceFormat: { type: "volume" },
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    markersRef.current = createSeriesMarkers(candles, []);

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Swap series data when the asset or timeframe changes (canvas preserved).
  useEffect(() => {
    const data = generateOhlc(asset.symbol, asset.refPrice, tf);
    seriesStartRef.current = data[0]?.time ?? 0;
    setPrevClose(data[data.length - 2]?.close ?? asset.refPrice);
    const last = data[data.length - 1];
    lastBarRef.current = last ? { ...last, close: livePrice } : null;
    candleRef.current?.setData(
      data.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );
    volumeRef.current?.setData(
      data.map((b) => ({
        time: b.time as Time,
        value: b.volume,
        color: b.close >= b.open ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)",
      })),
    );
    chartRef.current?.timeScale().applyOptions({ timeVisible: tf.seconds < 86_400 });
    chartRef.current?.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.symbol, asset.refPrice, tf]);

  // Live tick: drift the latest candle close.
  useEffect(() => {
    const last = lastBarRef.current;
    if (!last || !candleRef.current) return;
    const updated = {
      ...last,
      close: livePrice,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
    };
    lastBarRef.current = updated;
    candleRef.current.update({
      time: updated.time as Time,
      open: updated.open,
      high: updated.high,
      low: updated.low,
      close: updated.close,
    });
  }, [livePrice]);

  // Hedge annotations, aligned to the active timeframe bucket.
  useEffect(() => {
    const plugin = markersRef.current;
    if (!plugin) return;
    const lastTime = lastBarRef.current?.time ?? Number.POSITIVE_INFINITY;
    const seen = new Map<number, string>();
    for (const m of markers) {
      const aligned = alignToTimeframe(m.time, tf.seconds);
      if (aligned < seriesStartRef.current || aligned > lastTime) continue;
      seen.set(aligned, m.text);
    }
    plugin.setMarkers(
      [...seen.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([time, text]) => ({
          time: time as Time,
          position: "aboveBar" as const,
          color: "#ef4444",
          shape: "arrowDown" as const,
          text,
        })),
    );
  }, [markers, tf, asset.symbol]);

  const dayDelta = prevClose > 0 ? ((livePrice - prevClose) / prevClose) * 100 : 0;
  const up = dayDelta >= 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="num text-sm font-semibold text-slate-900">{asset.symbol}</span>
          <span className="truncate text-xs text-slate-500">
            {asset.company} · {asset.sector}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Timeframe switcher */}
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTf(t)}
                className={`num rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  tf.id === t.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="num text-sm font-semibold text-slate-900">{fmtNum(livePrice)}</span>
          <span
            className={`num inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
              up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {fmtSignedPct(dayDelta)}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="h-56 w-full" />
    </div>
  );
}
