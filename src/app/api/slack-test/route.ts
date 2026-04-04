import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function POST() {
  const config = getConfig();

  if (!config.slack?.enabled || !config.slack.webhookUrl) {
    return NextResponse.json(
      { error: "Slack is not configured" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(config.slack.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "*Snapshotr Alert*\nThis is a test alert from Snapshotr. Slack notifications are working!",
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Slack webhook returned ${res.status}` },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Slack webhook" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, message: "Test alert sent" });
}
