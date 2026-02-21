import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const chargerInputSchema = z.object({
  chargerId: z.string().min(1),
  vehicleId: z.string().min(1),
  minutesUntilDeparture: z.number().min(0),
  requiredEnergyKwh: z.number().min(0),
  deliveredEnergyKwh: z.number().min(0),
  maxChargeRateKw: z.number().positive()
});

const allocationRequestSchema = z.object({
  buildingBaseLoadKw: z.number().min(0),
  penaltyLimitKw: z.number().positive(),
  chargers: z.array(chargerInputSchema).min(1).max(16)
});

const allocationOutputSchema = z
  .object({
    allocations: z
      .array(
        z
          .object({
            chargerId: z.string().min(1),
            allocatedKw: z.number().min(0),
            status: z.enum(["Charging", "Throttled by AI", "Ready"]),
            reason: z.string().min(2).max(140)
          })
          .strict()
      )
      .min(1),
    summary: z.string().min(8).max(220)
  })
  .strict();

type AllocationRequest = z.infer<typeof allocationRequestSchema>;
type AllocationResponse = z.infer<typeof allocationOutputSchema>;

const TICK_HOURS = 5 / 60;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function heuristicAllocate(input: AllocationRequest): AllocationResponse {
  const availableEvBudget = Math.max(0, input.penaltyLimitKw - input.buildingBaseLoadKw);
  const scored = input.chargers
    .map((charger) => {
      const remainingKwh = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);
      const urgency = remainingKwh <= 0 ? -1 : remainingKwh * 3 + 600 / Math.max(10, charger.minutesUntilDeparture);

      return { ...charger, remainingKwh, urgency };
    })
    .sort((a, b) => b.urgency - a.urgency);

  let remainingBudget = availableEvBudget;
  const grants = new Map<string, number>();

  for (const charger of scored) {
    if (charger.remainingKwh <= 0 || remainingBudget <= 0) {
      grants.set(charger.chargerId, 0);
      continue;
    }

    const desiredKw = Math.min(charger.maxChargeRateKw, charger.remainingKwh / TICK_HOURS);
    const grantedKw = clamp(Math.min(desiredKw, remainingBudget), 0, charger.maxChargeRateKw);
    grants.set(charger.chargerId, grantedKw);
    remainingBudget -= grantedKw;
  }

  const allocations = input.chargers.map((charger) => {
    const remainingKwh = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);
    const desiredKw = Math.min(charger.maxChargeRateKw, remainingKwh / TICK_HOURS);
    const allocatedKw = Math.round(clamp(grants.get(charger.chargerId) ?? 0, 0, charger.maxChargeRateKw));
    const status =
      remainingKwh <= 0 ? "Ready" : allocatedKw + 3 < desiredKw ? "Throttled by AI" : "Charging";

    return {
      chargerId: charger.chargerId,
      allocatedKw,
      status,
      reason:
        status === "Ready"
          ? "Battery energy target already met."
          : status === "Throttled by AI"
            ? "Rate reduced to avoid demand charge threshold."
            : "Prioritized charging within available site capacity."
    } as const;
  });

  return {
    allocations,
    summary: "Allocated by deterministic fallback logic under demand-limit constraints."
  };
}

function sanitizeAiOutput(input: AllocationRequest, aiOutput: AllocationResponse): AllocationResponse {
  const fallback = heuristicAllocate(input);
  const fallbackMap = new Map(fallback.allocations.map((entry) => [entry.chargerId, entry]));
  const aiMap = new Map(aiOutput.allocations.map((entry) => [entry.chargerId, entry]));
  const availableEvBudget = Math.max(0, input.penaltyLimitKw - input.buildingBaseLoadKw);

  const merged = input.chargers.map((charger) => {
    const fallbackEntry = fallbackMap.get(charger.chargerId)!;
    const aiEntry = aiMap.get(charger.chargerId);
    const remainingKwh = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);

    if (!aiEntry || remainingKwh <= 0) {
      return {
        ...fallbackEntry,
        allocatedKw: remainingKwh <= 0 ? 0 : fallbackEntry.allocatedKw,
        status: remainingKwh <= 0 ? "Ready" : fallbackEntry.status
      };
    }

    const boundedKw = clamp(Math.round(aiEntry.allocatedKw), 0, charger.maxChargeRateKw);
    return {
      chargerId: charger.chargerId,
      allocatedKw: boundedKw,
      status: aiEntry.status,
      reason: aiEntry.reason
    };
  });

  const totalKw = merged.reduce((sum, allocation) => sum + allocation.allocatedKw, 0);
  if (totalKw > availableEvBudget && totalKw > 0) {
    const scale = availableEvBudget / totalKw;
    for (const allocation of merged) {
      allocation.allocatedKw = Math.floor(allocation.allocatedKw * scale);
      if (allocation.status === "Charging" && allocation.allocatedKw === 0) {
        allocation.status = "Throttled by AI";
      }
    }
  }

  return {
    allocations: merged,
    summary: aiOutput.summary
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = allocationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const fallback = heuristicAllocate(payload);
      return NextResponse.json(fallback);
    }

    try {
      const aiResult = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: allocationOutputSchema,
        temperature: 0.15,
        system:
          "You are AeroCharge, an EV fleet load balancing agent for commercial facilities. " +
          "Your objective is to keep the total site load under the demand limit while prioritizing vehicles with the earliest departures and highest unmet energy.",
        prompt: [
          "Given this state, return charger allocations.",
          "Constraints:",
          "- Include exactly one allocation for every chargerId in the input.",
          "- allocatedKw must be non-negative and realistically capped by each charger max.",
          "- Keep total EV allocation <= (penaltyLimitKw - buildingBaseLoadKw).",
          "- If a vehicle already reached required energy, set allocatedKw to 0 and status Ready.",
          "- Mark status as Throttled by AI when the vehicle is not ready but gets less than its desired charge.",
          "",
          JSON.stringify(payload)
        ].join("\n")
      });

      const sanitized = sanitizeAiOutput(payload, aiResult.object);
      return NextResponse.json(sanitized);
    } catch (aiError) {
      const fallback = heuristicAllocate(payload);
      return NextResponse.json({
        ...fallback,
        summary: `AI call failed. ${aiError instanceof Error ? aiError.message : "Unknown error"}`
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Allocator route failed.",
        details: error instanceof Error ? error.message : "Unknown server error."
      },
      { status: 500 }
    );
  }
}
