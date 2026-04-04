"use client";

import { useState, useEffect, useCallback } from "react";
import { SnapshotMeta } from "@/lib/types";

interface SnapshotsResponse {
  snapshots: SnapshotMeta[];
  total: number;
  page: number;
  perPage: number;
}

export function useSnapshots(pollInterval = 10000, perPage = 24, cameraId?: string | null) {
  const [data, setData] = useState<SnapshotsResponse>({
    snapshots: [],
    total: 0,
    page: 1,
    perPage,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reset page when camera changes
  useEffect(() => {
    setPage(1);
    setLoading(true);
  }, [cameraId]);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (cameraId) params.set("cameraId", cameraId);
      const res = await fetch(`/api/snapshots?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently retry next poll
    } finally {
      setLoading(false);
    }
  }, [page, perPage, cameraId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  const totalPages = Math.max(1, Math.ceil(data.total / perPage));

  return {
    snapshots: data.snapshots,
    total: data.total,
    page,
    totalPages,
    setPage,
    loading,
    refresh,
  };
}
