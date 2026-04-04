import { NextResponse } from "next/server";
import { readdirSync, statSync, existsSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();

  if (!existsSync(config.imageDir)) {
    return NextResponse.json(
      { totalBytes: 0, count: 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  let totalBytes = 0;
  let count = 0;

  try {
    const files = readdirSync(config.imageDir);
    for (const file of files) {
      if (file.endsWith(".jpg")) {
        totalBytes += statSync(path.join(config.imageDir, file)).size;
        count++;
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read image directory: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { totalBytes, count },
    { headers: { "Cache-Control": "no-store" } }
  );
}
