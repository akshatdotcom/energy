import { NextResponse } from "next/server";
import { getDailyEnergy, getSessionStats, getAllSites } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId") ?? "site-oak";
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    const daily = getDailyEnergy(days, siteId);
    const stats = getSessionStats(siteId);
    const allStats = getSessionStats();

    // Compute monthly summary
    const monthlyEnergy = daily.reduce((s, d) => s + d.energy_kwh, 0);
    const monthlySavings = daily.reduce((s, d) => s + d.savings_usd, 0);

    // Generate hourly demand profile (simulated but realistic)
    const hourlyProfile = Array.from({ length: 24 }, (_, h) => {
      const baseLoad = h >= 22 || h < 6 ? 180 + Math.random() * 40 : h >= 6 && h <= 9 ? 380 + Math.random() * 80 : h >= 12 && h <= 16 ? 420 + Math.random() * 60 : 300 + Math.random() * 60;
      const evLoad = h >= 18 || h < 6 ? 120 + Math.random() * 80 : h >= 7 && h <= 9 ? 60 + Math.random() * 40 : 20 + Math.random() * 30;
      return {
        hour: `${h.toString().padStart(2, "0")}:00`,
        base_load: Math.round(baseLoad),
        ev_load: Math.round(evLoad),
        total: Math.round(baseLoad + evLoad),
        demand_limit: 500,
      };
    });

    return NextResponse.json({
      daily,
      stats,
      allStats,
      monthly: { energy_kwh: Math.round(monthlyEnergy), savings_usd: Math.round(monthlySavings) },
      hourlyProfile,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
