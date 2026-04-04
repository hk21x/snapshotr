import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { sendDiscordAlert } from "@/lib/discord";

export async function POST() {
  const config = getConfig();

  if (!config.discord.enabled || !config.discord.webhookUrl) {
    return NextResponse.json(
      { error: "Discord is not configured" },
      { status: 400 }
    );
  }

  await sendDiscordAlert(
    config.discord.webhookUrl,
    "This is a test alert from Snapshotr. Discord notifications are working!"
  );

  return NextResponse.json({ success: true, message: "Test alert sent" });
}
