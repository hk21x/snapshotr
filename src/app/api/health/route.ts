import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { findFfmpeg } from "@/lib/capture-manager";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  const ffmpegPath = findFfmpeg();
  const ffmpegAvailable = ffmpegPath !== "ffmpeg" && existsSync(ffmpegPath);
  const imageDirExists = existsSync(config.imageDir);

  return NextResponse.json(
    {
      status: "ok",
      uptime: process.uptime(),
      ffmpeg: ffmpegAvailable,
      imageDir: imageDirExists,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
