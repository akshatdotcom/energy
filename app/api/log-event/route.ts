import { NextResponse } from "next/server";
import { insertEvent } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, payload } = body ?? {};

    insertEvent({
      site_id: "site-oak",
      event_type: String(eventType ?? "simulation_tick"),
      severity: "info",
      message: typeof payload === "object" ? JSON.stringify(payload) : String(payload ?? ""),
      payload: typeof payload === "object" ? payload : undefined,
    });

    return NextResponse.json({ ok: true, logged: true });
  } catch {
    return NextResponse.json({ ok: true, logged: false });
  }
}
