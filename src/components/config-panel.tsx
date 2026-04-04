"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CaptureConfig, CameraConfig } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface ConfigPanelProps {
  isRunning: boolean;
  onCamerasChange?: (cameras: CameraConfig[]) => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ConfigPanel({ isRunning, onCamerasChange }: ConfigPanelProps) {
  const [config, setConfig] = useState<CaptureConfig>({
    rtspUrl: "",
    intervalMinutes: 5,
    jpegQuality: 2,
    imageDir: "",
    discord: { enabled: false, webhookUrl: "" },
    schedule: { enabled: false, days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00" },
    retention: { enabled: false, maxAgeDays: 30, maxTotalMB: 0 },
  });
  const [saving, setSaving] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        setConfig(cfg);
        onCamerasChange?.(cfg.cameras ?? []);
      })
      .catch(() => toast.error("Failed to load config"));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      } else {
        toast.success("Configuration saved");
        onCamerasChange?.(config.cameras ?? []);
      }
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestDiscord() {
    setTestingDiscord(true);
    try {
      const res = await fetch("/api/discord-test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test alert sent to Discord");
      } else {
        toast.error(data.error || "Failed to send test");
      }
    } catch {
      toast.error("Failed to send test alert");
    } finally {
      setTestingDiscord(false);
    }
  }

  async function handleTestSlack() {
    setTestingSlack(true);
    try {
      const res = await fetch("/api/slack-test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test alert sent to Slack");
      } else {
        toast.error(data.error || "Failed to send test");
      }
    } catch {
      toast.error("Failed to send test alert");
    } finally {
      setTestingSlack(false);
    }
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    try {
      const res = await fetch("/api/telegram-test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test alert sent to Telegram");
      } else {
        toast.error(data.error || "Failed to send test");
      }
    } catch {
      toast.error("Failed to send test alert");
    } finally {
      setTestingTelegram(false);
    }
  }

  function toggleDay(day: number) {
    const days = config.schedule.days.includes(day)
      ? config.schedule.days.filter((d) => d !== day)
      : [...config.schedule.days, day].sort();
    setConfig({ ...config, schedule: { ...config.schedule, days } });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Camera */}
      <div className="px-5 py-4 border-b space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Camera</p>
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">RTSPS URL</Label>
            <Input
              value={config.rtspUrl}
              onChange={(e) => setConfig({ ...config, rtspUrl: e.target.value })}
              placeholder="rtsps://..."
              disabled={isRunning}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">
                Interval: {config.intervalMinutes}m
              </Label>
              <Slider
                value={[config.intervalMinutes]}
                onValueChange={([v]) => setConfig({ ...config, intervalMinutes: v })}
                min={1}
                max={60}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Quality: {config.jpegQuality}
              </Label>
              <Slider
                value={[config.jpegQuality]}
                onValueChange={([v]) => setConfig({ ...config, jpegQuality: v })}
                min={1}
                max={31}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Image Directory</Label>
            <Input
              value={config.imageDir}
              onChange={(e) => setConfig({ ...config, imageDir: e.target.value })}
              placeholder="/absolute/path/to/images"
              disabled={isRunning}
              className="h-8 text-xs mt-1"
            />
          </div>
        </div>
      </div>

      {/* Cameras */}
      <div className="px-5 py-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cameras</p>
          <button
            onClick={() => {
              const id = `cam-${Date.now()}`;
              const newCam: CameraConfig = {
                id,
                name: `Camera ${(config.cameras?.length ?? 0) + 1}`,
                rtspUrl: "",
                intervalMinutes: 5,
                jpegQuality: 2,
                schedule: { enabled: false, days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00" },
              };
              setConfig({ ...config, cameras: [...(config.cameras ?? []), newCam] });
            }}
            disabled={isRunning}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Add camera"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {(!config.cameras || config.cameras.length === 0) && (
          <p className="text-[10px] text-muted-foreground">
            Using default camera above. Add cameras here for multi-camera support.
          </p>
        )}

        {config.cameras?.map((cam, idx) => (
          <div key={cam.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Input
                value={cam.name}
                onChange={(e) => {
                  const cameras = [...(config.cameras ?? [])];
                  cameras[idx] = { ...cam, name: e.target.value };
                  setConfig({ ...config, cameras });
                }}
                className="h-7 text-xs font-medium border-0 p-0 shadow-none focus-visible:ring-0"
                placeholder="Camera name"
                disabled={isRunning}
              />
              <button
                onClick={() => {
                  const cameras = (config.cameras ?? []).filter((_, i) => i !== idx);
                  setConfig({ ...config, cameras });
                }}
                disabled={isRunning}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Remove camera"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">RTSPS URL</Label>
              <Input
                value={cam.rtspUrl}
                onChange={(e) => {
                  const cameras = [...(config.cameras ?? [])];
                  cameras[idx] = { ...cam, rtspUrl: e.target.value };
                  setConfig({ ...config, cameras });
                }}
                placeholder="rtsps://..."
                disabled={isRunning}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Interval: {cam.intervalMinutes}m</Label>
                <Slider
                  value={[cam.intervalMinutes]}
                  onValueChange={([v]) => {
                    const cameras = [...(config.cameras ?? [])];
                    cameras[idx] = { ...cam, intervalMinutes: v };
                    setConfig({ ...config, cameras });
                  }}
                  min={1}
                  max={60}
                  step={1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Quality: {cam.jpegQuality}</Label>
                <Slider
                  value={[cam.jpegQuality]}
                  onValueChange={([v]) => {
                    const cameras = [...(config.cameras ?? [])];
                    cameras[idx] = { ...cam, jpegQuality: v };
                    setConfig({ ...config, cameras });
                  }}
                  min={1}
                  max={31}
                  step={1}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="px-5 py-4 border-b space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Features</p>

        {/* Schedule */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium">Schedule</span>
          <Switch
            checked={config.schedule.enabled}
            onCheckedChange={(checked) =>
              setConfig({ ...config, schedule: { ...config.schedule, enabled: checked } })
            }
          />
        </div>
        {config.schedule.enabled && (
          <div className="pb-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => toggleDay(i)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    config.schedule.days.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={config.schedule.startTime}
                  onChange={(e) =>
                    setConfig({ ...config, schedule: { ...config.schedule, startTime: e.target.value } })
                  }
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={config.schedule.endTime}
                  onChange={(e) =>
                    setConfig({ ...config, schedule: { ...config.schedule, endTime: e.target.value } })
                  }
                  className="h-7 text-xs mt-0.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Discord */}
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm font-medium">Discord Alerts</span>
          <Switch
            checked={config.discord.enabled}
            onCheckedChange={(checked) =>
              setConfig({ ...config, discord: { ...config.discord, enabled: checked } })
            }
          />
        </div>
        {config.discord.enabled && (
          <div className="pb-2 space-y-2">
            <Input
              value={config.discord.webhookUrl}
              onChange={(e) =>
                setConfig({ ...config, discord: { ...config.discord, webhookUrl: e.target.value } })
              }
              placeholder="https://discord.com/api/webhooks/..."
              className="h-8 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestDiscord}
              disabled={testingDiscord || !config.discord.webhookUrl}
              className="w-full h-7 text-xs"
            >
              {testingDiscord ? "Sending..." : "Test Alert"}
            </Button>
          </div>
        )}

        {/* Slack */}
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm font-medium">Slack Alerts</span>
          <Switch
            checked={config.slack?.enabled ?? false}
            onCheckedChange={(checked) =>
              setConfig({ ...config, slack: { ...config.slack!, enabled: checked } })
            }
          />
        </div>
        {config.slack?.enabled && (
          <div className="pb-2 space-y-2">
            <Input
              value={config.slack?.webhookUrl ?? ""}
              onChange={(e) =>
                setConfig({ ...config, slack: { ...config.slack!, webhookUrl: e.target.value } })
              }
              placeholder="https://hooks.slack.com/services/..."
              className="h-8 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSlack}
              disabled={testingSlack || !config.slack?.webhookUrl}
              className="w-full h-7 text-xs"
            >
              {testingSlack ? "Sending..." : "Test Alert"}
            </Button>
          </div>
        )}

        {/* Telegram */}
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm font-medium">Telegram Alerts</span>
          <Switch
            checked={config.telegram?.enabled ?? false}
            onCheckedChange={(checked) =>
              setConfig({ ...config, telegram: { ...config.telegram!, enabled: checked } })
            }
          />
        </div>
        {config.telegram?.enabled && (
          <div className="pb-2 space-y-2">
            <Input
              value={config.telegram?.botToken ?? ""}
              onChange={(e) =>
                setConfig({ ...config, telegram: { ...config.telegram!, botToken: e.target.value } })
              }
              placeholder="Bot token"
              className="h-8 text-xs"
            />
            <Input
              value={config.telegram?.chatId ?? ""}
              onChange={(e) =>
                setConfig({ ...config, telegram: { ...config.telegram!, chatId: e.target.value } })
              }
              placeholder="Chat ID"
              className="h-8 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestTelegram}
              disabled={testingTelegram || !config.telegram?.botToken || !config.telegram?.chatId}
              className="w-full h-7 text-xs"
            >
              {testingTelegram ? "Sending..." : "Test Alert"}
            </Button>
          </div>
        )}

        {/* Retention */}
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm font-medium">Retention</span>
          <Switch
            checked={config.retention.enabled}
            onCheckedChange={(checked) =>
              setConfig({ ...config, retention: { ...config.retention, enabled: checked } })
            }
          />
        </div>
        {config.retention.enabled && (
          <div className="pb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Max Age (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.retention.maxAgeDays}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retention: { ...config.retention, maxAgeDays: parseInt(e.target.value) || 1 },
                    })
                  }
                  className="h-7 text-xs mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Max Size (MB)</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.retention.maxTotalMB}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retention: { ...config.retention, maxTotalMB: parseInt(e.target.value) || 0 },
                    })
                  }
                  className="h-7 text-xs mt-0.5"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="px-5 py-4">
        <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-sm">
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
