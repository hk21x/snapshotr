import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "fs";
import path from "path";
import os from "os";
import { cleanupSnapshots } from "../retention";
import { CaptureConfig } from "../types";

function makeConfig(overrides: Partial<CaptureConfig["retention"]> & { imageDir: string }): CaptureConfig {
  return {
    rtspUrl: "",
    intervalMinutes: 5,
    jpegQuality: 2,
    imageDir: overrides.imageDir,
    discord: { enabled: false, webhookUrl: "" },
    schedule: { enabled: false, days: [], startTime: "00:00", endTime: "23:59" },
    retention: {
      enabled: true,
      maxAgeDays: overrides.maxAgeDays ?? 30,
      maxTotalMB: overrides.maxTotalMB ?? 0,
    },
  };
}

function createSnapshot(dir: string, daysAgo: number, sizeBytes: number = 1024): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `snapshot_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`;
  writeFileSync(path.join(dir, filename), Buffer.alloc(sizeBytes));
  return filename;
}

describe("retention", () => {
  const tmpDir = path.join(os.tmpdir(), "snapshotr-test-retention");

  beforeEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  });

  it("does nothing when retention is disabled", () => {
    createSnapshot(tmpDir, 100);
    const config = makeConfig({ imageDir: tmpDir, maxAgeDays: 1 });
    config.retention.enabled = false;
    const deleted = cleanupSnapshots(config);
    expect(deleted).toBe(0);
    expect(readdirSync(tmpDir).length).toBe(1);
  });

  it("deletes snapshots older than maxAgeDays", () => {
    createSnapshot(tmpDir, 1);  // recent, keep
    createSnapshot(tmpDir, 10); // old, delete
    createSnapshot(tmpDir, 20); // old, delete
    const config = makeConfig({ imageDir: tmpDir, maxAgeDays: 5 });
    const deleted = cleanupSnapshots(config);
    expect(deleted).toBe(2);
    expect(readdirSync(tmpDir).length).toBe(1);
  });

  it("deletes oldest when total exceeds maxTotalMB", () => {
    // Create 3 files of ~512KB each = ~1.5MB total
    createSnapshot(tmpDir, 3, 512 * 1024);
    createSnapshot(tmpDir, 2, 512 * 1024);
    createSnapshot(tmpDir, 1, 512 * 1024);
    // Set limit to 1MB - should delete oldest until under
    const config = makeConfig({ imageDir: tmpDir, maxTotalMB: 1, maxAgeDays: 999 });
    const deleted = cleanupSnapshots(config);
    expect(deleted).toBeGreaterThanOrEqual(1);
    // Should have at most ~1MB remaining
    const remaining = readdirSync(tmpDir);
    expect(remaining.length).toBeLessThan(3);
  });

  it("handles empty directory", () => {
    const config = makeConfig({ imageDir: tmpDir, maxAgeDays: 1 });
    const deleted = cleanupSnapshots(config);
    expect(deleted).toBe(0);
  });

  it("handles non-existent directory", () => {
    const config = makeConfig({ imageDir: "/tmp/nonexistent-snapshotr-dir", maxAgeDays: 1 });
    const deleted = cleanupSnapshots(config);
    expect(deleted).toBe(0);
  });

  it("ignores non-snapshot files", () => {
    writeFileSync(path.join(tmpDir, "readme.txt"), "hello");
    writeFileSync(path.join(tmpDir, "photo.jpg"), "data");
    createSnapshot(tmpDir, 100); // old snapshot
    const config = makeConfig({ imageDir: tmpDir, maxAgeDays: 1 });
    const deleted = cleanupSnapshots(config);
    expect(deleted).toBe(1);
    // Non-snapshot files preserved
    expect(existsSync(path.join(tmpDir, "readme.txt"))).toBe(true);
    expect(existsSync(path.join(tmpDir, "photo.jpg"))).toBe(true);
  });
});
