// ── Aegis quantitative collateral model ──────────────────────────────────────
// Pure math shared by the client dashboard and the API routes.
//
// Every collateral sleeve is risk-budget calibrated so its baseline MMR is
// 78% (maint req = 78% of baseline stressed collateral). Post-swap, the sleeve
// holds $29,950 of USDT (after 20bps total swap cost) and the MMR collapses
// back into the ultra-safe band.

import type { AssetKey, CollateralState } from "./risk-types";

export interface AssetMeta {
  key: AssetKey;
  symbol: string;
  company: string; // display name
  sector: string; // desk classification
  refPrice: number;
  haircut: number;
}

export const ASSETS: Record<AssetKey, AssetMeta> = {
  rAAPL: {
    key: "rAAPL",
    symbol: "rAAPL",
    company: "Apple",
    sector: "Tech & Hardware",
    refPrice: 232.0,
    haircut: 0.7,
  },
  rNVDA: {
    key: "rNVDA",
    symbol: "rNVDA",
    company: "Nvidia",
    sector: "AI & Semis",
    refPrice: 125.0,
    haircut: 0.6,
  },
  rTSLA: {
    key: "rTSLA",
    symbol: "rTSLA",
    company: "Tesla",
    sector: "EV & Energy",
    refPrice: 240.0,
    haircut: 0.55,
  },
  rMSFT: {
    key: "rMSFT",
    symbol: "rMSFT",
    company: "Microsoft",
    sector: "Enterprise & Cloud",
    refPrice: 420.0,
    haircut: 0.75,
  },
  rAMZN: {
    key: "rAMZN",
    symbol: "rAMZN",
    company: "Amazon",
    sector: "E-Commerce & AWS",
    refPrice: 185.0,
    haircut: 0.7,
  },
  rGOOGL: {
    key: "rGOOGL",
    symbol: "rGOOGL",
    company: "Alphabet",
    sector: "Search & AdTech",
    refPrice: 175.0,
    haircut: 0.7,
  },
};

export const ASSET_LIST: AssetMeta[] = [
  ASSETS.rAAPL,
  ASSETS.rNVDA,
  ASSETS.rTSLA,
  ASSETS.rMSFT,
  ASSETS.rAMZN,
  ASSETS.rGOOGL,
];

export const MODEL = {
  positionSizeBtc: 2.5,
  entryPriceBtc: 65_240,
  leverage: 20,
  baselineBtcMark: 66_000,

  usdtHaircut: 1.0,
  /** Volatility stress overlay applied to tokenized-equity collateral. */
  stressOverlay: 0.9,
  /** Baseline risk budget: maintenance requirement as a fraction of baseline stressed collateral. */
  baselineRiskBudget: 0.78,

  mmrWarning: 0.85,
  mmrLiquidation: 0.9,

  slippageBps: 5, // 0.05%
  takerFeeBps: 15, // 0.15%

  baselineAssetUsd: 25_000,
  baselineUsdtUsd: 5_000,
} as const;

/** Maintenance requirement for the sleeve (risk-budget calibrated). */
export function maintenanceMarginFor(haircut: number): number {
  const baselineStressed =
    MODEL.baselineAssetUsd * haircut * MODEL.stressOverlay + MODEL.baselineUsdtUsd;
  return Math.round(MODEL.baselineRiskBudget * baselineStressed * 100) / 100;
}

export interface MarginSnapshot {
  markBtc: number;
  notionalUsd: number;
  upnlUsd: number;
  effectiveCollateralUsd: number; // haircut-adjusted, unstressed
  stressedCollateralUsd: number; // haircut + stress overlay
  mmr: number; // 0..1
  equityUsd: number; // effective collateral + uPnL
  liquidationPriceBtc: number;
  liquidationBufferPct: number; // positive % distance below mark
  maintenanceMarginUsd: number;
}

export function computeMarginSnapshot(
  collateral: CollateralState,
  markBtc: number,
  haircut: number,
): MarginSnapshot {
  const { positionSizeBtc, entryPriceBtc } = MODEL;
  const notionalUsd = positionSizeBtc * markBtc;
  const upnlUsd = positionSizeBtc * (markBtc - entryPriceBtc);

  const effectiveCollateralUsd =
    collateral.assetUsd * haircut + collateral.usdtUsd * MODEL.usdtHaircut;
  const stressedCollateralUsd =
    collateral.assetUsd * haircut * MODEL.stressOverlay +
    collateral.usdtUsd * MODEL.usdtHaircut;

  const maintenanceMarginUsd = maintenanceMarginFor(haircut);
  const mmr =
    stressedCollateralUsd > 0
      ? maintenanceMarginUsd / stressedCollateralUsd
      : Number.POSITIVE_INFINITY;

  const equityUsd = effectiveCollateralUsd + upnlUsd;

  // Liquidation prints when MMR breaches the 90% liquidation threshold.
  const equityAtLiquidation = maintenanceMarginUsd / MODEL.mmrLiquidation;
  const lossCapacityUsd = equityUsd - equityAtLiquidation;
  const liquidationPriceBtc = markBtc - lossCapacityUsd / positionSizeBtc;
  const liquidationBufferPct =
    markBtc > 0 ? ((markBtc - liquidationPriceBtc) / markBtc) * 100 : 0;

  return {
    markBtc,
    notionalUsd,
    upnlUsd,
    effectiveCollateralUsd,
    stressedCollateralUsd,
    mmr,
    equityUsd,
    liquidationPriceBtc,
    liquidationBufferPct,
    maintenanceMarginUsd,
  };
}

/** Net USD credited to the destination asset after swap costs. */
export function computeSwapFill(amountUsd: number, refPrice: number) {
  const slippageBps = MODEL.slippageBps;
  const feeBps = MODEL.takerFeeBps;
  const feeUsd = (amountUsd * feeBps) / 10_000;
  const slippageUsd = (amountUsd * slippageBps) / 10_000;
  const filledUsd = amountUsd - feeUsd - slippageUsd;
  const execPrice = refPrice * (1 - slippageBps / 10_000);
  const qty = refPrice > 0 ? amountUsd / refPrice : amountUsd;
  return { slippageBps, feeBps, feeUsd, slippageUsd, filledUsd, execPrice, qty };
}

/** MMR band classification for gauge color + status copy. */
export function mmrBand(mmr: number): {
  label: string;
  tone: "optimal" | "elevated" | "warning" | "liquidation";
} {
  if (mmr >= MODEL.mmrLiquidation)
    return { label: "Liquidation", tone: "liquidation" };
  if (mmr >= MODEL.mmrWarning) return { label: "Warning", tone: "warning" };
  if (mmr >= 0.7) return { label: "Elevated", tone: "elevated" };
  return { label: "Optimal", tone: "optimal" };
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function fmtUsd(n: number, digits = 2): string {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

export function fmtSignedUsd(n: number, digits = 2): string {
  return (n >= 0 ? "+" : "-") + fmtUsd(Math.abs(n), digits);
}

export function fmtNum(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPct(n: number, digits = 2): string {
  return `${fmtNum(n, digits)}%`;
}

export function fmtSignedPct(n: number, digits = 2): string {
  return `${n >= 0 ? "+" : ""}${fmtNum(n, digits)}%`;
}

/** ISO-8601 timestamp with millisecond precision. */
export function isoMs(d: Date = new Date()): string {
  return d.toISOString();
}
