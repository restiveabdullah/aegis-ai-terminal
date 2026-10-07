import { NextResponse } from "next/server";
import type {
  AnalyzeRiskResponse,
  FactorBreakdown,
  Recommendation,
  RiskAssessment,
  ThreatLevel,
} from "@/lib/risk-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the Chief Risk Officer AI for an institutional multi-asset crypto fund using tokenized US equities on Bitget as margin collateral. Analyze incoming market news against the specified collateral ticker. You must output strictly raw JSON matching this schema:
{
  "threat_level": "CRITICAL" | "ELEVATED" | "NOMINAL",
  "projected_equity_drawdown_pct": number (e.g. -14.5),
  "margin_call_probability": number (0 to 100),
  "recommendation": "EMERGENCY_DELEVERAGE_COLLATERAL" | "HOLD",
  "factor_breakdown": {
    "regulatory_risk": number (0 to 100),
    "supply_chain_risk": number (0 to 100),
    "liquidity_risk": number (0 to 100)
  },
  "executive_rationale": "Two precise sentences explaining the mechanical impact on collateral liquidity."
}`;

const THREATS: ThreatLevel[] = ["CRITICAL", "ELEVATED", "NOMINAL"];
const RECOS: Recommendation[] = ["EMERGENCY_DELEVERAGE_COLLATERAL", "HOLD"];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number(v.replace("%", "")) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampScore(v: unknown, fallback: number): number {
  return Math.round(clamp(toNumber(v, fallback), 0, 100));
}

/** Derive factor scores when the model omits them. */
function deriveFactors(threat: ThreatLevel, mcProb: number): FactorBreakdown {
  if (threat === "CRITICAL")
    return { regulatory_risk: 88, supply_chain_risk: 81, liquidity_risk: 74 };
  if (threat === "ELEVATED")
    return { regulatory_risk: 34, supply_chain_risk: 42, liquidity_risk: 31 };
  return {
    regulatory_risk: 12,
    supply_chain_risk: 10,
    liquidity_risk: clampScore(mcProb * 0.5, 9),
  };
}

/** Normalize + hard-validate any model payload into the strict schema. */
function sanitizeAssessment(raw: unknown): RiskAssessment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const drawdown = clamp(toNumber(r.projected_equity_drawdown_pct, NaN), -60, 20);
  if (!Number.isFinite(drawdown)) return null;

  let threat = String(r.threat_level ?? "").toUpperCase() as ThreatLevel;
  if (!THREATS.includes(threat)) {
    threat = drawdown <= -10 ? "CRITICAL" : drawdown <= -3 ? "ELEVATED" : "NOMINAL";
  }

  let recommendation = String(r.recommendation ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_") as Recommendation;
  if (!RECOS.includes(recommendation)) {
    recommendation = threat === "CRITICAL" ? "EMERGENCY_DELEVERAGE_COLLATERAL" : "HOLD";
  }

  const mcProb = Math.round(
    clamp(toNumber(r.margin_call_probability, threat === "CRITICAL" ? 90 : 15), 0, 100),
  );

  const derived = deriveFactors(threat, mcProb);
  const fb = (r.factor_breakdown ?? {}) as Record<string, unknown>;
  const factor_breakdown: FactorBreakdown = {
    regulatory_risk: clampScore(fb.regulatory_risk, derived.regulatory_risk),
    supply_chain_risk: clampScore(fb.supply_chain_risk, derived.supply_chain_risk),
    liquidity_risk: clampScore(fb.liquidity_risk, derived.liquidity_risk),
  };

  const rationale =
    typeof r.executive_rationale === "string" && r.executive_rationale.trim().length > 10
      ? r.executive_rationale.trim().slice(0, 600)
      : "Model output omitted a rationale; collateral liquidity impact inferred from projected drawdown.";

  return {
    threat_level: threat,
    projected_equity_drawdown_pct: Math.round(drawdown * 100) / 100,
    margin_call_probability: mcProb,
    recommendation,
    factor_breakdown,
    executive_rationale: rationale,
  };
}

/** Extract a JSON object from raw model content (handles think-tags + prose). */
function extractJson(content: string): unknown {
  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Deterministic heuristic fallback — guarantees the terminal never dead-ends
 * on stage if the inference network hiccups. Mirrors the CRO decision tree.
 */
function heuristicAssessment(headline: string, asset: string): RiskAssessment {
  const t = headline.toLowerCase();
  const catastrophic = [
    "antitrust", "department of justice", "doj", "halted", "halt",
    "sanction", "fraud", "supply chain", "production stop", "recall",
    "bankruptcy", "delisting", "ban on", "export control", "export ban",
    "probe", "injunction", "outage", "suspended", "separation", "ftc", "nhtsa",
  ].some((k) => t.includes(k));
  const negative = [
    "drop", "decline", "miss", "slip", "downgrade", "weak", "slow",
    "competition", "fall", "below expectations", "lawsuit",
  ].some((k) => t.includes(k));
  const positive = [
    "buyback", "repurchase", "dividend", "raise", "record", "beat",
    "accelerated", "upgrade", "surge", "all-time high",
  ].some((k) => t.includes(k));

  if (catastrophic) {
    return {
      threat_level: "CRITICAL",
      projected_equity_drawdown_pct: -15.2,
      margin_call_probability: 94,
      recommendation: "EMERGENCY_DELEVERAGE_COLLATERAL",
      factor_breakdown: { regulatory_risk: 95, supply_chain_risk: 88, liquidity_risk: 76 },
      executive_rationale:
        `The headline constitutes an idiosyncratic shock to the tokenized equity leg, implying an immediate double-digit gap-down in ${asset} marks and evaporation of exit liquidity on the venue. With the collateral haircut compounding a -15% revaluation, the position's maintenance margin ratio would breach the 90% liquidation threshold; emergency swap into USDT restores full-weight collateral before forced deleveraging triggers.`,
    };
  }
  if (positive && !negative) {
    return {
      threat_level: "NOMINAL",
      projected_equity_drawdown_pct: 2.4,
      margin_call_probability: 6,
      recommendation: "HOLD",
      factor_breakdown: { regulatory_risk: 8, supply_chain_risk: 6, liquidity_risk: 5 },
      executive_rationale:
        "Capital-return announcements mechanically support the equity leg via demand absorption and reduced float, strengthening collateral value rather than impairing it. Margin utilization remains comfortably below the 85% warning band; no deleveraging action is warranted.",
    };
  }
  if (negative) {
    return {
      threat_level: "ELEVATED",
      projected_equity_drawdown_pct: -6.4,
      margin_call_probability: 44,
      recommendation: "HOLD",
      factor_breakdown: { regulatory_risk: 22, supply_chain_risk: 38, liquidity_risk: 31 },
      executive_rationale:
        "A single-digit shipment decline implies a moderate mark-down in the equity collateral, partially absorbed by the existing haircut buffer. Maintenance margin ratio remains under the warning threshold, but the desk should pre-stage a USDT swap route in case follow-on headlines deepen the drawdown.",
    };
  }
  return {
    threat_level: "NOMINAL",
    projected_equity_drawdown_pct: -1.1,
    margin_call_probability: 12,
    recommendation: "HOLD",
    factor_breakdown: { regulatory_risk: 14, supply_chain_risk: 12, liquidity_risk: 10 },
    executive_rationale:
      "The headline carries no first-order impact on the collateral ticker's liquidity or mark-to-market value. Collateral coverage remains intact; continue passive monitoring.",
  };
}

/** Call OpenRouter for a specific model slug; null on any failure. */
async function callModel(
  apiKey: string,
  model: string,
  headline: string,
  asset: string,
): Promise<RiskAssessment | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aegis-risk-core.terminal",
        "X-Title": "Aegis AI - Bitget Cross-Asset Margin Protector",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 450,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Collateral ticker under review: ${asset}\nIncoming headline: ${headline}\nDesk calibration bands: idiosyncratic supply-chain disruptions or regulatory/antitrust/credit shocks → CRITICAL; single-digit demand, shipment or earnings misses → ELEVATED; capital returns, buybacks, dividend raises or neutral headlines → NOMINAL.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return sanitizeAssessment(extractJson(content));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const started = performance.now();
  let headline = "";
  let asset = "rAAPL";

  try {
    const body = (await req.json()) as { headline?: unknown; asset?: unknown };
    if (typeof body.headline === "string") headline = body.headline.trim();
    if (typeof body.asset === "string" && body.asset.trim()) asset = body.asset.trim().slice(0, 12);
  } catch {
    // fall through to validation
  }

  if (!headline || headline.length < 8) {
    return NextResponse.json(
      { ok: false, error: "headline is required (min 8 characters)" },
      { status: 422 },
    );
  }
  if (headline.length > 1500) headline = headline.slice(0, 1500);

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || "qwen/qwen3-next-80b-a3b-instruct:free";

  if (apiKey) {
    // Resilient chain: configured slug first, then its canonical equivalent —
    // free-tier slugs rotate availability on the router.
    const canonical = model.replace(/:free$/, "");
    const chain = [...new Set([model, canonical])];
    for (const slug of chain) {
      const assessment = await callModel(apiKey, slug, headline, asset);
      if (assessment) {
        const payload: AnalyzeRiskResponse = {
          ok: true,
          assessment,
          meta: {
            engine: model,
            path: "OPENROUTER",
            latencyMs: Math.round(performance.now() - started),
            asset,
            analyzedAt: new Date().toISOString(),
            note: slug !== model ? `Served via canonical slug ${slug}.` : undefined,
          },
        };
        return NextResponse.json(payload);
      }
    }
  }

  const payload: AnalyzeRiskResponse = {
    ok: true,
    assessment: heuristicAssessment(headline, asset),
    meta: {
      engine: model,
      path: "HEURISTIC_FALLBACK",
      latencyMs: Math.round(performance.now() - started),
      asset,
      analyzedAt: new Date().toISOString(),
      note: apiKey
        ? "Inference path unavailable — deterministic CRO heuristic engaged."
        : "OPENROUTER_API_KEY absent — deterministic CRO heuristic engaged.",
    },
  };
  return NextResponse.json(payload);
}
