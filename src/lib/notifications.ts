import { CaptureConfig } from "./types";
import { logStore } from "./log-store";

async function sendDiscord(webhookUrl: string, message: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "Snapshotr Alert",
          description: message,
          color: 0xed4245,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
  if (!res.ok) {
    logStore.add("warn", `Discord webhook returned ${res.status}`);
  }
}

async function sendSlack(webhookUrl: string, message: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*Snapshotr Alert*\n${message}`,
    }),
  });
  if (!res.ok) {
    logStore.add("warn", `Slack webhook returned ${res.status}`);
  }
}

async function sendTelegram(botToken: string, chatId: string, message: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `⚠️ Snapshotr Alert\n\n${message}`,
        parse_mode: "HTML",
      }),
    }
  );
  if (!res.ok) {
    logStore.add("warn", `Telegram API returned ${res.status}`);
  }
}

export async function sendAlerts(config: CaptureConfig, message: string): Promise<void> {
  const promises: Promise<void>[] = [];

  if (config.discord.enabled && config.discord.webhookUrl) {
    promises.push(
      sendDiscord(config.discord.webhookUrl, message).catch((err) =>
        logStore.add("warn", `Discord alert failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      )
    );
  }

  if (config.slack?.enabled && config.slack.webhookUrl) {
    promises.push(
      sendSlack(config.slack.webhookUrl, message).catch((err) =>
        logStore.add("warn", `Slack alert failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      )
    );
  }

  if (config.telegram?.enabled && config.telegram.botToken && config.telegram.chatId) {
    promises.push(
      sendTelegram(config.telegram.botToken, config.telegram.chatId, message).catch((err) =>
        logStore.add("warn", `Telegram alert failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      )
    );
  }

  await Promise.all(promises);
}

// Re-export for backward compatibility (discord-test route)
export const sendDiscordAlert = sendDiscord;
