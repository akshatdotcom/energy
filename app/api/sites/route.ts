import { NextResponse } from "next/server";
import { getAllSites, getChargersBySite, getVehiclesBySite, getSessionStats, getRecentEvents } from "@/lib/db";

export async function GET() {
  try {
    const sites = getAllSites();
    const enriched = sites.map((site) => {
      const chargers = getChargersBySite(site.id);
      const vehicles = getVehiclesBySite(site.id);
      const stats = getSessionStats(site.id);
      return {
        ...site,
        charger_count: chargers.length,
        vehicle_count: vehicles.length,
        active_sessions: chargers.filter((c) => c.status === "charging" || c.status === "throttled").length,
        faulted_chargers: chargers.filter((c) => c.status === "faulted").length,
        stats,
      };
    });
    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
