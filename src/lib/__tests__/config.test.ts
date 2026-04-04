import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

describe("config", () => {
  const tmpDir = path.join(os.tmpdir(), "snapshotr-test-config");
  const configPath = path.join(tmpDir, "config.json");

  beforeEach(() => {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    vi.stubEnv("CONFIG_DIR", tmpDir);
    vi.stubEnv("IMAGE_DIR", "");
    vi.stubEnv("RTSP_URL", "");
    vi.stubEnv("INTERVAL_MINUTES", "");
    vi.stubEnv("JPEG_QUALITY", "");
    // Clear module cache so config.ts re-evaluates
    vi.resetModules();
  });

  afterEach(() => {
    if (existsSync(configPath)) unlinkSync(configPath);
    vi.unstubAllEnvs();
  });

  it("returns defaults when no config file exists", async () => {
    const { getConfig } = await import("../config");
    const config = getConfig();
    expect(config.intervalMinutes).toBe(5);
    expect(config.jpegQuality).toBe(2);
    expect(config.discord.enabled).toBe(false);
    expect(config.schedule.enabled).toBe(false);
    expect(config.retention.enabled).toBe(false);
  });

  it("reads from config.json", async () => {
    writeFileSync(
      configPath,
      JSON.stringify({ rtspUrl: "rtsps://test:7441/cam", intervalMinutes: 10 })
    );
    const { getConfig } = await import("../config");
    const config = getConfig();
    expect(config.rtspUrl).toBe("rtsps://test:7441/cam");
    expect(config.intervalMinutes).toBe(10);
    // Defaults still apply for missing fields
    expect(config.jpegQuality).toBe(2);
  });

  it("env vars override config.json", async () => {
    writeFileSync(
      configPath,
      JSON.stringify({ intervalMinutes: 10, jpegQuality: 5 })
    );
    vi.stubEnv("INTERVAL_MINUTES", "15");
    vi.stubEnv("JPEG_QUALITY", "20");
    const { getConfig } = await import("../config");
    const config = getConfig();
    expect(config.intervalMinutes).toBe(15);
    expect(config.jpegQuality).toBe(20);
  });

  it("saves config to disk", async () => {
    const { saveConfig, getConfig } = await import("../config");
    const defaults = getConfig();
    defaults.intervalMinutes = 30;
    saveConfig(defaults);
    // Re-import to re-read file
    vi.resetModules();
    const { getConfig: getConfig2 } = await import("../config");
    expect(getConfig2().intervalMinutes).toBe(30);
  });

  it("handles malformed config.json gracefully", async () => {
    writeFileSync(configPath, "not valid json {{{");
    const { getConfig } = await import("../config");
    const config = getConfig();
    // Should fall back to defaults
    expect(config.intervalMinutes).toBe(5);
  });

  it("merges nested objects correctly", async () => {
    writeFileSync(
      configPath,
      JSON.stringify({ discord: { enabled: true } })
    );
    const { getConfig } = await import("../config");
    const config = getConfig();
    expect(config.discord.enabled).toBe(true);
    expect(config.discord.webhookUrl).toBe(""); // default preserved
  });
});
