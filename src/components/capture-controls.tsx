"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaptureStatus, CameraConfig } from "@/lib/types";
import { toast } from "sonner";

interface CaptureControlsProps {
  status: (CaptureStatus & { cameras?: Record<string, CaptureStatus> }) | null;
  loading?: boolean;
  cameraId?: string | null;
  cameras?: CameraConfig[];
  onAction: () => void;
  onCameraChange?: (cameraId: string | null) => void;
}

export function CaptureControls({
  status,
  loading: initialLoading,
  cameraId,
  cameras,
  onAction,
  onCameraChange,
}: CaptureControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: "start" | "stop" | "now") {
    setLoading(action);
    try {
      const base = action === "now" ? "/api/snapshot-now" : `/api/capture/${action}`;
      const url = cameraId ? `${base}?cameraId=${cameraId}` : base;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Action failed");
      }
      onAction();
    } catch {
      toast.error("Request failed");
    } finally {
      setLoading(null);
    }
  }

  // Determine status for active camera
  const activeStatus = cameraId && status?.cameras?.[cameraId]
    ? status.cameras[cameraId]
    : status;
  const isRunning = activeStatus?.isRunning ?? false;

  function formatTime(iso: string | null) {
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleTimeString();
  }

  if (initialLoading) {
    return (
      <div className="px-5 py-4 border-b space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
          <div className="flex-1 h-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-b space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>

      {/* Camera selector */}
      {cameras && cameras.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onCameraChange?.(null)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              !cameraId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Default
          </button>
          {cameras.map((cam) => (
            <button
              key={cam.id}
              onClick={() => onCameraChange?.(cam.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                cameraId === cam.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cam.name || cam.id}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Capture</span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isRunning
              ? "bg-green-500/10 text-green-500 dark:bg-green-500/15"
              : "bg-muted text-muted-foreground"
          }`}>
            {isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            )}
            {isRunning ? "Running" : "Stopped"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Last</span>
          <span className="text-xs font-medium tabular-nums">{formatTime(activeStatus?.lastCapture ?? null)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Next</span>
          <span className="text-xs font-medium tabular-nums">{formatTime(activeStatus?.nextCapture ?? null)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-xs font-medium tabular-nums">{(activeStatus?.totalCaptures ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {isRunning ? (
          <Button
            onClick={() => handleAction("stop")}
            disabled={loading !== null}
            variant="destructive"
            className="flex-1 h-8 text-xs"
          >
            {loading === "stop" ? "..." : "Stop"}
          </Button>
        ) : (
          <Button
            onClick={() => handleAction("start")}
            disabled={loading !== null}
            className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
          >
            {loading === "start" ? "..." : "Start"}
          </Button>
        )}
        <Button
          onClick={() => handleAction("now")}
          disabled={loading !== null}
          variant="outline"
          className="flex-1 h-8 text-xs"
        >
          {loading === "now" ? "..." : "Capture Now"}
        </Button>
      </div>
    </div>
  );
}
