import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function POST() {
  const config = getConfig();

  if (!config.telegram?.enabled || !config.telegram.botToken || !config.telegram.chatId) {
    return NextResponse.json(
      { error: "Telegram is not configured" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.telegram.chatId,
          text: "⚠️ Snapshotr Alert\n\nThis is a test alert from Snapshotr. Telegram notifications are working!",
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.description || `Telegram API returned ${res.status}` },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Telegram API" },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, message: "Test alert sent" });
}
