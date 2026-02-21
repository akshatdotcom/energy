import { NextResponse } from "next/server";
import { getRebates } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId") ?? undefined;
    const rebates = getRebates(siteId);
    const totalClaimed = rebates.filter((r) => r.status === "claimed").reduce((s, r) => s + r.amount_usd, 0);
    const totalActive = rebates.filter((r) => r.status === "active").reduce((s, r) => s + r.amount_usd, 0);
    const totalEligible = rebates.filter((r) => r.status === "eligible").reduce((s, r) => s + r.amount_usd, 0);
    const totalPending = rebates.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount_usd, 0);
    return NextResponse.json({
      rebates,
      summary: { totalClaimed, totalActive, totalEligible, totalPending },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
