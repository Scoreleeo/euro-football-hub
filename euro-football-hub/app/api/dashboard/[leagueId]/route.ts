import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getDashboardData } from "@/lib/api-football/services";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await context.params;
  const season = Number(request.nextUrl.searchParams.get("season") || config.defaultSeason);
  const payload = await getDashboardData(Number(leagueId), season);
  return NextResponse.json(payload);
}