// ── Deterministic multi-timeframe OHLC synthesizer ──────────────────────────
// Generates fully deterministic candle series per (symbol, timeframe) so the
// collateral chart is always populated and reproducible between reloads.

export type TimeframeId = "15M" | "1H" | "4H" | "1D";

export interface Timeframe {
  id: TimeframeId;
  label: string;
  seconds: number;
  count: number;
}

export const TIMEFRAMES: Timeframe[] = [
  { id: "15M", label: "15M", seconds: 900, count: 96 }, // 24h intra-day
  { id: "1H", label: "1H", seconds: 3600, count: 72 }, // last 3 days
  { id: "4H", label: "4H", seconds: 14_400, count: 60 }, // last 10 days
  { id: "1D", label: "1D", seconds: 86_400, count: 100 }, // last 100 days
];

export const DEFAULT_TIMEFRAME: Timeframe = TIMEFRAMES[3]; // 1D

export interface OhlcBar {
  time: number; // unix seconds, aligned to timeframe boundary
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Align a unix timestamp to the start of its timeframe bucket. */
export function alignToTimeframe(unixSec: number, tfSeconds: number): number {
  return Math.floor(unixSec / tfSeconds) * tfSeconds;
}

/**
 * Deterministic candle series for a symbol on a timeframe; the final close is
 * normalized to refPrice so the chart always anchors to the live mark.
 */
export function generateOhlc(
  symbol: string,
  refPrice: number,
  tf: Timeframe = DEFAULT_TIMEFRAME,
  now: Date = new Date(),
): OhlcBar[] {
  const rnd = mulberry32(seedFromString(`${symbol}:${tf.id}`));
  // Scale per-bar volatility with the square root of the timeframe.
  const scale = Math.sqrt(tf.seconds / 86_400);
  const amp = 0.03 * scale;
  const drift = 0.0012 * (tf.seconds / 86_400);

  const raw: { o: number; h: number; l: number; c: number; v: number }[] = [];
  let prev = refPrice * (0.88 + rnd() * 0.08);

  for (let i = 0; i < tf.count; i++) {
    const shock = (rnd() - 0.485) * amp * 2;
    const c = prev * (1 + drift + shock);
    const o = prev;
    const h = Math.max(o, c) * (1 + rnd() * amp * 0.24);
    const l = Math.min(o, c) * (1 - rnd() * amp * 0.24);
    const v = Math.round(
      (900_000 / scale + rnd() * 1_800_000) * (1 + Math.abs(shock) * 60) * scale,
    );
    raw.push({ o, h, l, c, v });
    prev = c;
  }

  const norm = refPrice / raw[raw.length - 1].c;
  const end = alignToTimeframe(Math.floor(now.getTime() / 1000), tf.seconds);
  const start = end - (tf.count - 1) * tf.seconds;

  return raw.map((b, i) => {
    const o = round2(b.o * norm);
    const c = round2(b.c * norm);
    const h = round2(Math.max(b.h * norm, o, c));
    const l = round2(Math.min(b.l * norm, o, c));
    return { time: start + i * tf.seconds, open: o, high: h, low: l, close: c, volume: b.v };
  });
}
