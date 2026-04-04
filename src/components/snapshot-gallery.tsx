"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SnapshotMeta } from "@/lib/types";
import { Download, Trash2, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";

interface SnapshotGalleryProps {
  snapshots: SnapshotMeta[];
  total: number;
  page: number;
  totalPages: number;
  loading?: boolean;
  cameraId?: string | null;
  onPageChange: (page: number) => void;
}

export function SnapshotGallery({
  snapshots,
  total,
  page,
  totalPages,
  loading,
  cameraId,
  onPageChange,
}: SnapshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [fullSize, setFullSize] = useState(false);

  const selected = selectedIndex !== null ? snapshots[selectedIndex] : null;
  const camParam = cameraId ? `?cameraId=${cameraId}` : "";

  const grouped = useMemo(() => {
    const groups: Record<string, SnapshotMeta[]> = {};
    for (const snap of snapshots) {
      const date = snap.timestamp.split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(snap);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [snapshots]);

  // Keyboard navigation in lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowLeft" && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (e.key === "ArrowRight" && selectedIndex < snapshots.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      } else if (e.key === "Escape" && fullSize) {
        e.preventDefault();
        setFullSize(false);
      }
    },
    [selectedIndex, snapshots.length, fullSize]
  );

  useEffect(() => {
    if (selectedIndex !== null) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedIndex, handleKeyDown]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleDownload(snap: SnapshotMeta) {
    const a = document.createElement("a");
    a.href = `/api/snapshots/${snap.filename}${camParam}`;
    a.download = snap.filename;
    a.click();
  }

  async function handleDelete(snap: SnapshotMeta) {
    setDeleting(snap.filename);
    try {
      const res = await fetch(`/api/snapshots/${snap.filename}${camParam}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Snapshot deleted");
        if (selectedIndex !== null) setSelectedIndex(null);
      } else {
        toast.error("Failed to delete snapshot");
      }
    } catch {
      toast.error("Failed to delete snapshot");
    } finally {
      setDeleting(null);
    }
  }

  function getGlobalIndex(snap: SnapshotMeta) {
    return snapshots.indexOf(snap);
  }

  return (
    <>
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <div className="aspect-video bg-muted animate-pulse" />
                <div className="px-3 py-2 flex justify-between">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">
            No snapshots yet. Use &quot;Capture Now&quot; or start the interval capture.
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map(([date, snaps]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground shrink-0">
                    {formatDate(date)}
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {snaps.map((snap) => (
                    <div
                      key={snap.filename}
                      className="group relative rounded-xl overflow-hidden border bg-card hover:ring-2 hover:ring-primary hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                      <button
                        onClick={() => setSelectedIndex(getGlobalIndex(snap))}
                        className="w-full text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/snapshots/${snap.filename}${camParam}`}
                          alt={`Snapshot from ${formatTime(snap.timestamp)}`}
                          loading="lazy"
                          className="w-full aspect-video object-cover"
                        />
                      </button>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-medium">{formatTime(snap.timestamp)}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mr-1">
                            {formatSize(snap.sizeBytes)}
                          </span>
                          <button
                            onClick={() => handleDownload(snap)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDelete(snap)}
                            disabled={deleting === snap.filename}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={page <= 1} className="h-7 text-xs">First</Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="h-7 text-xs">Prev</Button>
            <span className="text-xs text-muted-foreground tabular-nums px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="h-7 text-xs">Next</Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className="h-7 text-xs">Last</Button>
          </div>
        )}
      </div>

      {/* Lightbox - Fitted view */}
      <Dialog open={selectedIndex !== null && !fullSize} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {selected ? `Snapshot from ${formatTime(selected.timestamp)}` : "Snapshot"}
          </DialogTitle>
          {selected && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/snapshots/${selected.filename}${camParam}`}
                alt={`Snapshot from ${formatTime(selected.timestamp)}`}
                className="w-full h-auto"
              />

              {/* Nav arrows */}
              {selectedIndex !== null && selectedIndex > 0 && (
                <button
                  onClick={() => setSelectedIndex(selectedIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {selectedIndex !== null && selectedIndex < snapshots.length - 1 && (
                <button
                  onClick={() => setSelectedIndex(selectedIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Bottom bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 flex items-center justify-between">
                <div className="text-white text-sm">
                  {formatTime(selected.timestamp)}
                  <span className="text-white/60 ml-2">{formatSize(selected.sizeBytes)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFullSize(true)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="View original size"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(selected)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    disabled={deleting === selected.filename}
                    className="p-2 rounded-full bg-white/10 hover:bg-red-500/50 text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-size original viewer */}
      {selected && fullSize && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-auto">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-sm">
            <div className="text-white text-sm">
              {formatTime(selected.timestamp)}
              <span className="text-white/60 ml-2">{formatSize(selected.sizeBytes)}</span>
              <span className="text-white/40 ml-2">Original size</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIndex !== null && selectedIndex > 0 && (
                <button
                  onClick={() => setSelectedIndex(selectedIndex - 1)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {selectedIndex !== null && selectedIndex < snapshots.length - 1 && (
                <button
                  onClick={() => setSelectedIndex(selectedIndex + 1)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setFullSize(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Fit to window"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownload(selected)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setFullSize(false); setSelectedIndex(null); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors text-sm font-medium px-3"
                title="Close"
              >
                ESC
              </button>
            </div>
          </div>
          {/* Scrollable image at native resolution */}
          <div className="flex justify-center p-4 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/snapshots/${selected.filename}${camParam}`}
              alt={`Snapshot from ${formatTime(selected.timestamp)}`}
              className="max-w-none h-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
