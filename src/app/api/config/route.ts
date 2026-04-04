import { NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/config";
import { CaptureConfig } from "@/lib/types";
import { captureManager } from "@/lib/capture-manager";

export async function GET() {
  return NextResponse.json(getConfig());
}

export async function PUT(request: Request) {
  const body = (await request.json()) as CaptureConfig;

  if (!body.rtspUrl || (!body.rtspUrl.startsWith("rtsp://") && !body.rtspUrl.startsWith("rtsps://"))) {
    return NextResponse.json({ error: "Invalid RTSP URL" }, { status: 400 });
  }
  if (!body.intervalMinutes || body.intervalMinutes < 1 || body.intervalMinutes > 1440) {
    return NextResponse.json({ error: "Interval must be 1-1440 minutes" }, { status: 400 });
  }
  if (!body.jpegQuality || body.jpegQuality < 1 || body.jpegQuality > 31) {
    return NextResponse.json({ error: "JPEG quality must be 1-31" }, { status: 400 });
  }
  if (!body.imageDir || !body.imageDir.startsWith("/")) {
    return NextResponse.json({ error: "Image directory must be an absolute path" }, { status: 400 });
  }

  // Discord validation
  if (body.discord?.enabled && body.discord.webhookUrl) {
    const url = body.discord.webhookUrl;
    if (!url.startsWith("https://discord.com/api/webhooks/") && !url.startsWith("https://discordapp.com/api/webhooks/")) {
      return NextResponse.json({ error: "Invalid Discord webhook URL" }, { status: 400 });
    }
  }

  // Slack validation
  if (body.slack?.enabled && body.slack.webhookUrl) {
    if (!body.slack.webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json({ error: "Invalid Slack webhook URL" }, { status: 400 });
    }
  }

  // Telegram validation
  if (body.telegram?.enabled) {
    if (!body.telegram.botToken) {
      return NextResponse.json({ error: "Telegram bot token is required" }, { status: 400 });
    }
    if (!body.telegram.chatId) {
      return NextResponse.json({ error: "Telegram chat ID is required" }, { status: 400 });
    }
  }

  // Schedule validation
  const timePattern = /^\d{2}:\d{2}$/;
  if (body.schedule?.enabled) {
    if (!timePattern.test(body.schedule.startTime) || !timePattern.test(body.schedule.endTime)) {
      return NextResponse.json({ error: "Schedule times must be in HH:MM format" }, { status: 400 });
    }
    if (!Array.isArray(body.schedule.days) || body.schedule.days.some((d: number) => d < 0 || d > 6)) {
      return NextResponse.json({ error: "Schedule days must be 0-6 (Sun-Sat)" }, { status: 400 });
    }
  }

  // Retention validation
  if (body.retention?.enabled) {
    if (typeof body.retention.maxAgeDays !== "number" || body.retention.maxAgeDays < 1) {
      return NextResponse.json({ error: "Retention max age must be at least 1 day" }, { status: 400 });
    }
    if (typeof body.retention.maxTotalMB !== "number" || body.retention.maxTotalMB < 0) {
      return NextResponse.json({ error: "Retention max size must be 0 or greater" }, { status: 400 });
    }
  }

  saveConfig(body);

  // Restart capture if running to pick up new config
  const status = captureManager.getStatus();
  if (status.isRunning) {
    captureManager.stop();
    captureManager.start();
  }

  return NextResponse.json(body);
}
