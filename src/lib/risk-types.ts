// ── Aegis AI : Bitget Cross-Asset Margin Protector ──────────────────────────
// Shared domain types used by API routes, the risk engine hook and UI panels.

export type ThreatLevel = "CRITICAL" | "ELEVATED" | "NOMINAL";
export type Recommendation = "EMERGENCY_DELEVERAGE_COLLATERAL" | "HOLD";

export type AssetKey = "rAAPL" | "rNVDA" | "rTSLA" | "rMSFT" | "rAMZN" | "rGOOGL";

/** Explainable 0-100 risk factor scores returned by the CRO engine. */
export interface FactorBreakdown {
  regulatory_risk: number;
  supply_chain_risk: number;
  liquidity_risk: number;
}

/** Strict schema emitted by the Qwen 3 CRO engine. */
export interface RiskAssessment {
  threat_level: ThreatLevel;
  projected_equity_drawdown_pct: number;
  margin_call_probability: number;
  recommendation: Recommendation;
  factor_breakdown: FactorBreakdown;
  executive_rationale: string;
}

export interface AnalyzeRiskResponse {
  ok: boolean;
  assessment: RiskAssessment;
  meta: {
    engine: string;
    path: "OPENROUTER" | "HEURISTIC_FALLBACK";
    latencyMs: number;
    asset: string;
    analyzedAt: string;
    note?: string;
  };
}

export type ExecutionMode = "LIVE" | "SIMULATION";
export type TicketStatus = "SETTLED" | "PENDING" | "REJECTED";
export type LedgerAction = "COLLATERAL_SWAP" | "LIQUIDITY_REBALANCE";

/** Immutable audit-ticket appended to the execution ledger. */
export interface LedgerTicket {
  ticketId: string;
  ts: string; // ISO-8601 with millisecond precision
  action: LedgerAction;
  assetFrom: string;
  assetTo: string;
  amountUsd: number;
  qty: number;
  execPrice: number;
  filledUsd: number; // net USD credited after slippage + fees
  slippageBps: number;
  feeUsd: number;
  savedUsd: number; // projected margin preserved by the maneuver
  orderId: string;
  mode: ExecutionMode;
  status: TicketStatus;
  latencyMs: number;
  sig: string; // audit signature (hex)
}

export interface RebalanceResponse {
  ok: boolean;
  ticket: LedgerTicket;
  meta: {
    venue: "BITGET_SPOT";
    mode: ExecutionMode;
    executedAt: string;
    note: string;
    persistence: "POSTGRES" | "OFFLINE";
  };
}

export interface LedgerResponse {
  ok: boolean;
  tickets: LedgerTicket[];
  persistence: "POSTGRES" | "OFFLINE";
}

// ── Engine state machine ─────────────────────────────────────────────────────

export type EnginePhase =
  | "IDLE"
  | "ANALYZING"
  | "ASSESSED"
  | "DEFENSE"
  | "SWAPPING"
  | "SECURED";

export interface CollateralState {
  assetUsd: number; // USD value of the active tokenized-equity sleeve
  usdtUsd: number; // stable reserve
}

export interface DefenseStep {
  label: string;
  state: "pending" | "active" | "done";
}
