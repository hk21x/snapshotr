import { NextResponse } from "next/server";
import { captureManager } from "@/lib/capture-manager";
import { logStore } from "@/lib/log-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("cameraId") || undefined;

  return NextResponse.json({
    ...captureManager.getStatus(cameraId),
    cameras: captureManager.getAllStatuses(),
    logs: logStore.getAll(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
