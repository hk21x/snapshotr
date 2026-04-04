import { readdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { CaptureConfig } from "./types";
import { logStore } from "./log-store";

const FILENAME_PATTERN = /^snapshot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.jpg$/;

interface SnapshotFile {
  filename: string;
  filepath: string;
  timestamp: Date;
  sizeBytes: number;
}

function listSnapshots(imageDir: string): SnapshotFile[] {
  let files: string[];
  try {
    files = readdirSync(imageDir);
  } catch {
    return [];
  }

  return files
    .filter((f) => FILENAME_PATTERN.test(f))
    .map((filename) => {
      const match = filename.match(FILENAME_PATTERN)!;
      const timestamp = new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5]),
        parseInt(match[6])
      );
      const filepath = path.join(imageDir, filename);
      const sizeBytes = statSync(filepath).size;
      return { filename, filepath, timestamp, sizeBytes };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function cleanupSnapshots(config: CaptureConfig): number {
  if (!config.retention.enabled) return 0;

  const snapshots = listSnapshots(config.imageDir);
  if (snapshots.length === 0) return 0;

  const toDelete = new Set<string>();
  const now = Date.now();

  // Delete snapshots older than maxAgeDays
  if (config.retention.maxAgeDays > 0) {
    const maxAgeMs = config.retention.maxAgeDays * 24 * 60 * 60 * 1000;
    for (const snap of snapshots) {
      if (now - snap.timestamp.getTime() > maxAgeMs) {
        toDelete.add(snap.filepath);
      }
    }
  }

  // Delete oldest snapshots when total exceeds maxTotalMB
  if (config.retention.maxTotalMB > 0) {
    const maxBytes = config.retention.maxTotalMB * 1024 * 1024;
    const remaining = snapshots.filter((s) => !toDelete.has(s.filepath));
    let totalBytes = remaining.reduce((sum, s) => sum + s.sizeBytes, 0);

    // Remove oldest first until under limit
    for (const snap of remaining) {
      if (totalBytes <= maxBytes) break;
      toDelete.add(snap.filepath);
      totalBytes -= snap.sizeBytes;
    }
  }

  // Perform deletions
  let deleted = 0;
  for (const filepath of toDelete) {
    try {
      unlinkSync(filepath);
      deleted++;
    } catch {
      // File may have already been removed
    }
  }

  if (deleted > 0) {
    logStore.add("info", `Retention cleanup: deleted ${deleted} snapshot${deleted !== 1 ? "s" : ""}`);
  }

  return deleted;
}
