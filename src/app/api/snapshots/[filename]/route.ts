import { NextResponse } from "next/server";
import { readFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

const SAFE_FILENAME = /^snapshot_\d{8}_\d{6}\.jpg$/;
const SAFE_CAMERA_ID = /^[a-z0-9][a-z0-9_-]*$/;

function resolveFilepath(filename: string, request: Request): string | null {
  const config = getConfig();
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get("cameraId");

  if (cameraId && !SAFE_CAMERA_ID.test(cameraId)) return null;

  const baseDir = cameraId
    ? path.join(config.imageDir, cameraId)
    : config.imageDir;

  return path.join(baseDir, filename);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!SAFE_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = resolveFilepath(filename, request);
  if (!filepath || !existsSync(filepath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = readFileSync(filepath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!SAFE_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = resolveFilepath(filename, request);
  if (!filepath || !existsSync(filepath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  unlinkSync(filepath);
  return NextResponse.json({ success: true });
}
