import { NextResponse } from "next/server";
import { getAllVehicles, getAllChargers, getRecentEvents, getSessionStats } from "@/lib/db";

export async function GET() {
  try {
    const vehicles = getAllVehicles();
    const chargers = getAllChargers();
    const events = getRecentEvents(10);
    const stats = getSessionStats();

    // Simulate current SoC for demo purposes
    const vehiclesWithSoC = vehicles.map((v, i) => {
      const charger = chargers.find((c) => {
        const activeMap: Record<string, string> = {
          CH01: "EV-A01", CH02: "EV-A02", CH03: "EV-A05",
          CH04: "EV-A07", CH05: "EV-A03", CH07: "EV-A09",
          CH09: "EV-B01", CH11: "EV-B03", CH13: "EV-C01",
        };
        return activeMap[c.id] === v.id;
      });

      const isCharging = !!charger;
      const soc = isCharging
        ? 45 + Math.round(((Date.now() / 1000) % 40) + (i * 7)) % 45
        : 88 + (i % 12);
      const clampedSoC = Math.min(99, Math.max(20, soc));

      return {
        ...v,
        soc_pct: clampedSoC,
        status: isCharging
          ? charger!.status === "throttled"
            ? "throttled"
            : "charging"
          : clampedSoC > 90
          ? "ready"
          : "idle",
        charger_id: charger?.id ?? null,
        allocated_kw: isCharging
          ? charger!.status === "throttled"
            ? Math.round(charger!.max_kw * 0.35)
            : Math.round(charger!.max_kw * (0.65 + (i % 3) * 0.1))
          : 0,
        departure_time: `${7 + (i % 3)}:${i % 2 === 0 ? "00" : "30"} AM`,
        minutes_to_departure: 60 + (i * 15) % 120,
        kwh_remaining: Math.round(v.battery_kwh * (1 - clampedSoC / 100) * 10) / 10,
      };
    });

    return NextResponse.json({ vehicles: vehiclesWithSoC, chargers, events, stats });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
