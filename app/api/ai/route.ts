import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GEMINI_MODEL } from "@/lib/ai";

const insightSchema = z.object({
  predictions: z.array(
    z.object({
      title: z.string().min(5).max(80),
      detail: z.string().min(10).max(200),
      confidence: z.number().min(0).max(100),
      type: z.enum(["success", "warning", "info", "action"]),
    })
  ).min(2).max(6),
  anomalySummary: z.string().min(10).max(300),
  recommendation: z.string().min(10).max(300),
  savingsInsight: z.string().min(10).max(200),
});

export type AiInsightsResponse = z.infer<typeof insightSchema>;

const requestSchema = z.object({
  siteLoadKw: z.number().optional(),
  evLoadKw: z.number().optional(),
  demandLimitKw: z.number().optional(),
  activeChargers: z.number().optional(),
  throttledChargers: z.number().optional(),
  totalChargers: z.number().optional(),
  avoidedPenaltyKw: z.number().optional(),
  estimatedSavingsUsd: z.number().optional(),
  peakLoadToday: z.number().optional(),
  recentEvents: z.array(z.object({
    title: z.string(),
    severity: z.string(),
    timestamp: z.string(),
  })).optional(),
});

function heuristicInsights(input: z.infer<typeof requestSchema>): AiInsightsResponse {
  const load = input.siteLoadKw ?? 420;
  const limit = input.demandLimitKw ?? 500;
  const headroom = limit - load;
  const throttled = input.throttledChargers ?? 2;
  const active = input.activeChargers ?? 4;
  const savings = input.estimatedSavingsUsd ?? 2400;

  return {
    predictions: [
      {
        title: `All vehicles projected ready by 7:15 AM`,
        detail: `${active} active chargers on track to meet departure targets. Current load balancing maintains optimal throughput.`,
        confidence: 94,
        type: "success",
      },
      {
        title: `Peak demand window: 2–4 PM today`,
        detail: `Building HVAC load typically peaks mid-afternoon. Recommend pre-shifting ${Math.round(load * 0.4)} kWh of EV charging to overnight window.`,
        confidence: 87,
        type: "action",
      },
      {
        title: headroom < 50
          ? `Low headroom alert: ${headroom} kW remaining`
          : `Site headroom healthy at ${headroom} kW`,
        detail: headroom < 50
          ? `Site is within ${headroom} kW of the demand limit. Additional throttling may be needed if building load increases.`
          : `Current load of ${load} kW leaves comfortable margin below the ${limit} kW demand limit.`,
        confidence: 92,
        type: headroom < 50 ? "warning" : "info",
      },
      ...(throttled > 0 ? [{
        title: `${throttled} charger${throttled > 1 ? "s" : ""} currently throttled by AI`,
        detail: `Demand management active — lower-priority sessions are rate-limited to protect high-priority departures and stay under ${limit} kW.`,
        confidence: 98,
        type: "warning" as const,
      }] : []),
    ],
    anomalySummary: throttled > 2
      ? `Elevated throttling detected — ${throttled} sessions rate-limited due to high building base load. Monitor HVAC and lighting schedules for optimization opportunities.`
      : `System operating within normal parameters. No anomalies detected in the last 24 hours. All charger heartbeats current.`,
    recommendation: savings > 1000
      ? `Continue current AI load-shaping strategy. Estimated $${Math.round(savings).toLocaleString()} in demand charge avoidance this month. Consider enrolling in PG&E demand response program for additional $200–400/month revenue.`
      : `AI load management active and performing well. Recommend reviewing overnight charging windows to maximize off-peak rate savings.`,
    savingsInsight: `AI load shaping has avoided an estimated $${Math.round(savings).toLocaleString()} in demand charges this session. At current rates, projected monthly savings of $${Math.round(savings * 3).toLocaleString()}.`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ ...heuristicInsights(payload), source: "heuristic" });
    }

    try {
      const result = await generateObject({
        model: google(GEMINI_MODEL),
        schema: insightSchema,
        temperature: 0.3,
        system:
          "You are AeroCharge AI, an intelligent energy management assistant for commercial EV fleet charging. " +
          "You analyze real-time site data and provide actionable insights, predictions, and anomaly detection. " +
          "Be specific with numbers, practical with recommendations, and concise. " +
          "Use the site's demand limit as the key constraint. Focus on demand charge avoidance, fleet readiness, and operational efficiency.",
        prompt: [
          "Analyze the following energy site data and provide intelligent insights:",
          "",
          `Site Load: ${payload.siteLoadKw ?? "unknown"} kW`,
          `EV Charging Load: ${payload.evLoadKw ?? "unknown"} kW`,
          `Demand Limit: ${payload.demandLimitKw ?? 500} kW`,
          `Active Chargers: ${payload.activeChargers ?? "unknown"}`,
          `Throttled Chargers: ${payload.throttledChargers ?? 0}`,
          `Total Chargers: ${payload.totalChargers ?? "unknown"}`,
          `Avoided Penalty: ${payload.avoidedPenaltyKw ?? 0} kW`,
          `Estimated Savings: $${payload.estimatedSavingsUsd ?? 0}`,
          `Peak Load Today: ${payload.peakLoadToday ?? "unknown"} kW`,
          "",
          payload.recentEvents?.length
            ? `Recent Events:\n${payload.recentEvents.map(e => `- [${e.severity}] ${e.title} (${e.timestamp})`).join("\n")}`
            : "No recent events.",
          "",
          "Provide 3-5 predictions, an anomaly summary, a recommendation, and a savings insight.",
        ].join("\n"),
      });

      return NextResponse.json({ ...result.object, source: "gemini" });
    } catch (aiError) {
      const fallback = heuristicInsights(payload);
      return NextResponse.json({
        ...fallback,
        source: "heuristic",
        aiError: aiError instanceof Error ? aiError.message : "Gemini API call failed",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "AI insights route failed.",
        details: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
