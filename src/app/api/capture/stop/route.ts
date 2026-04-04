import { NextResponse } from "next/server";
import { captureManager } from "@/lib/capture-manager";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("cameraId") || undefined;
  const result = captureManager.stop(cameraId);
  if (!result.success) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}
