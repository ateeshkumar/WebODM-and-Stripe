import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Workflow services are reachable",
    appName: "WebODM Hub",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}
