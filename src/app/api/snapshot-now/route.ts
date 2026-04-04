import { NextResponse } from "next/server";
import { captureManager } from "@/lib/capture-manager";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("cameraId") || undefined;
  const success = await captureManager.captureOnce(undefined, cameraId);
  if (!success) {
    return NextResponse.json({ success: false, message: "Capture failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: "Snapshot captured" });
}
