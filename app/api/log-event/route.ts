import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase";

const logEventSchema = z
  .object({
    eventType: z.string().min(1).max(64),
    payload: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export async function POST(request: Request) {
  try {
    const parsed = logEventSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, logged: false, reason: "Supabase is not configured." });
    }

    const { error } = await supabase.from("simulation_events").insert({
      event_type: parsed.data.eventType,
      payload: parsed.data.payload ?? {},
      created_at: new Date().toISOString()
    });

    if (error) {
      return NextResponse.json({
        ok: true,
        logged: false,
        reason: error.message
      });
    }

    return NextResponse.json({ ok: true, logged: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error"
      },
      { status: 500 }
    );
  }
}
