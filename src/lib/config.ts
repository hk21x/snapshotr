import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { CaptureConfig } from "./types";

const CONFIG_DIR = process.env.CONFIG_DIR || process.cwd();
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: CaptureConfig = {
  rtspUrl: "rtsps://192.168.1.1:7441/your-stream-id",
  intervalMinutes: 5,
  jpegQuality: 2,
  imageDir: process.env.IMAGE_DIR || path.join(process.cwd(), "images"),
  discord: {
    enabled: false,
    webhookUrl: "",
  },
  slack: {
    enabled: false,
    webhookUrl: "",
  },
  telegram: {
    enabled: false,
    botToken: "",
    chatId: "",
  },
  schedule: {
    enabled: false,
    days: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "18:00",
  },
  retention: {
    enabled: false,
    maxAgeDays: 30,
    maxTotalMB: 0,
  },
};

function applyEnvOverrides(config: CaptureConfig): CaptureConfig {
  const result = { ...config };

  if (process.env.RTSP_URL) result.rtspUrl = process.env.RTSP_URL;
  if (process.env.INTERVAL_MINUTES) result.intervalMinutes = parseInt(process.env.INTERVAL_MINUTES, 10);
  if (process.env.JPEG_QUALITY) result.jpegQuality = parseInt(process.env.JPEG_QUALITY, 10);
  if (process.env.IMAGE_DIR) result.imageDir = process.env.IMAGE_DIR;

  if (process.env.DISCORD_WEBHOOK_URL) {
    result.discord = {
      ...result.discord,
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    };
  }
  if (process.env.DISCORD_ENABLED !== undefined) {
    result.discord = {
      ...result.discord,
      enabled: process.env.DISCORD_ENABLED === "true",
    };
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    result.slack = { ...result.slack!, webhookUrl: process.env.SLACK_WEBHOOK_URL };
  }
  if (process.env.SLACK_ENABLED !== undefined) {
    result.slack = { ...result.slack!, enabled: process.env.SLACK_ENABLED === "true" };
  }

  if (process.env.TELEGRAM_BOT_TOKEN) {
    result.telegram = { ...result.telegram!, botToken: process.env.TELEGRAM_BOT_TOKEN };
  }
  if (process.env.TELEGRAM_CHAT_ID) {
    result.telegram = { ...result.telegram!, chatId: process.env.TELEGRAM_CHAT_ID };
  }
  if (process.env.TELEGRAM_ENABLED !== undefined) {
    result.telegram = { ...result.telegram!, enabled: process.env.TELEGRAM_ENABLED === "true" };
  }

  if (process.env.RETENTION_ENABLED !== undefined) {
    result.retention = {
      ...result.retention,
      enabled: process.env.RETENTION_ENABLED === "true",
    };
  }
  if (process.env.RETENTION_MAX_AGE_DAYS) {
    result.retention = {
      ...result.retention,
      maxAgeDays: parseInt(process.env.RETENTION_MAX_AGE_DAYS, 10),
    };
  }
  if (process.env.RETENTION_MAX_TOTAL_MB) {
    result.retention = {
      ...result.retention,
      maxTotalMB: parseInt(process.env.RETENTION_MAX_TOTAL_MB, 10),
    };
  }

  return result;
}

export function getConfig(): CaptureConfig {
  let fileConfig: Partial<CaptureConfig> = {};

  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      // Fall through to defaults
    }
  }

  const merged: CaptureConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    discord: { ...DEFAULT_CONFIG.discord, ...fileConfig.discord },
    slack: { ...DEFAULT_CONFIG.slack!, ...(fileConfig.slack ?? {}) },
    telegram: { ...DEFAULT_CONFIG.telegram!, ...(fileConfig.telegram ?? {}) },
    schedule: { ...DEFAULT_CONFIG.schedule, ...fileConfig.schedule },
    retention: { ...DEFAULT_CONFIG.retention, ...fileConfig.retention },
  };

  return applyEnvOverrides(merged);
}

export function saveConfig(config: CaptureConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
