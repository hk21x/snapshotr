"use client";

import { useState, useEffect } from "react";
import { ConfigPanel } from "@/components/config-panel";
import { CaptureControls } from "@/components/capture-controls";
import { SnapshotGallery } from "@/components/snapshot-gallery";
import { LogPanel } from "@/components/log-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Clock } from "@/components/clock";
import { useStatus } from "@/hooks/use-status";
import { useSnapshots } from "@/hooks/use-snapshots";
import { Camera, Menu, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraConfig } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function Home() {
  const { status, loading: statusLoading, refresh: refreshStatus } = useStatus();
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const { snapshots, total, page, totalPages, setPage, loading: galleryLoading, refresh: refreshSnapshots } = useSnapshots(10000, 24, activeCamera);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storage, setStorage] = useState<{ totalBytes: number; count: number } | null>(null);

  // Fetch cameras from config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => setCameras(cfg.cameras ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function fetchStorage() {
      fetch("/api/storage")
        .then((r) => r.json())
        .then(setStorage)
        .catch(() => {});
    }
    fetchStorage();
    const id = setInterval(fetchStorage, 30_000);
    return () => clearInterval(id);
  }, []);

  function handleAction() {
    refreshStatus();
    setTimeout(refreshSnapshots, 1000);
  }

  const exportUrl = activeCamera
    ? `/api/snapshots/export?cameraId=${activeCamera}`
    : "/api/snapshots/export";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] border-r bg-background flex flex-col overflow-y-auto
        transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0 lg:bg-muted/30
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Snapshotr</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CaptureControls
          status={status}
          loading={statusLoading}
          cameraId={activeCamera}
          cameras={cameras}
          onAction={handleAction}
          onCameraChange={(id) => setActiveCamera(id)}
        />

        {/* Storage indicator */}
        {storage && storage.count > 0 && (
          <div className="px-5 py-3 border-b">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Storage</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{storage.count} snapshots</span>
              <span className="text-xs font-medium">{formatBytes(storage.totalBytes)}</span>
            </div>
          </div>
        )}

        <ConfigPanel isRunning={status?.isRunning ?? false} onCamerasChange={setCameras} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold">
              {activeCamera
                ? cameras.find((c) => c.id === activeCamera)?.name ?? activeCamera
                : "Snapshots"}
            </h2>
            {total > 0 && (
              <span className="text-xs text-muted-foreground">{total.toLocaleString()} total</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = exportUrl;
                  a.download = "";
                  a.click();
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            )}
            <Clock />
            <ThemeToggle />
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto">
          <SnapshotGallery
            snapshots={snapshots}
            total={total}
            page={page}
            totalPages={totalPages}
            loading={galleryLoading}
            cameraId={activeCamera}
            onPageChange={setPage}
          />
        </div>

        {/* Log dock */}
        <LogPanel logs={status?.logs ?? []} />
      </div>
    </div>
  );
}
