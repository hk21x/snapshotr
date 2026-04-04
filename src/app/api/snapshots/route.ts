import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";
import { getConfig } from "@/lib/config";
import { SnapshotMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILENAME_PATTERN = /^snapshot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.jpg$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") ?? "24", 10)));
  const cameraId = searchParams.get("cameraId");
  const config = getConfig();

  const imageDir = cameraId
    ? path.join(config.imageDir, cameraId)
    : config.imageDir;

  let files: string[];
  try {
    files = readdirSync(imageDir);
  } catch {
    return NextResponse.json({ snapshots: [], total: 0, page, perPage });
  }

  const all: SnapshotMeta[] = files
    .filter((f) => FILENAME_PATTERN.test(f))
    .map((filename) => {
      const match = filename.match(FILENAME_PATTERN)!;
      const timestamp = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
      const filepath = path.join(imageDir, filename);
      const sizeBytes = statSync(filepath).size;
      return { filename, timestamp, sizeBytes };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = all.length;
  const snapshots = all.slice((page - 1) * perPage, page * perPage);

  return NextResponse.json({ snapshots, total, page, perPage }, {
    headers: { "Cache-Control": "no-store" },
  });
}
