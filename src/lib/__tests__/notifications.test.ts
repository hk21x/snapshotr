import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendAlerts } from "../notifications";
import { CaptureConfig } from "../types";

function makeConfig(overrides?: Partial<CaptureConfig>): CaptureConfig {
  return {
    rtspUrl: "",
    intervalMinutes: 5,
    jpegQuality: 2,
    imageDir: "/tmp",
    discord: { enabled: false, webhookUrl: "" },
    schedule: { enabled: false, days: [], startTime: "00:00", endTime: "23:59" },
    retention: { enabled: false, maxAgeDays: 30, maxTotalMB: 0 },
    ...overrides,
  };
}

describe("notifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends no alerts when all disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await sendAlerts(makeConfig(), "test");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends discord alert when enabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const config = makeConfig({
      discord: { enabled: true, webhookUrl: "https://discord.com/api/webhooks/test" },
    });
    await sendAlerts(config, "test message");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://discord.com/api/webhooks/test");
  });

  it("sends slack alert when enabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const config = makeConfig({
      slack: { enabled: true, webhookUrl: "https://hooks.slack.com/services/test" },
    });
    await sendAlerts(config, "test message");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://hooks.slack.com/services/test");
  });

  it("sends telegram alert when enabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const config = makeConfig({
      telegram: { enabled: true, botToken: "123:ABC", chatId: "456" },
    });
    await sendAlerts(config, "test message");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toContain("api.telegram.org/bot123:ABC/sendMessage");
  });

  it("sends to all channels concurrently", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const config = makeConfig({
      discord: { enabled: true, webhookUrl: "https://discord.com/api/webhooks/test" },
      slack: { enabled: true, webhookUrl: "https://hooks.slack.com/services/test" },
      telegram: { enabled: true, botToken: "123:ABC", chatId: "456" },
    });
    await sendAlerts(config, "test");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("handles fetch failure gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    const config = makeConfig({
      discord: { enabled: true, webhookUrl: "https://discord.com/api/webhooks/test" },
    });
    // Should not throw
    await expect(sendAlerts(config, "test")).resolves.toBeUndefined();
  });
});
