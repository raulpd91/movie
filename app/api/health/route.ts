import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "movie-tracker-skill",
    endpoints: ["/api/health", "/api/mark-movie", "/api/og"],
  });
}
