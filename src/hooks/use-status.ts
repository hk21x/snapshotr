"use client";

import { useState, useEffect, useCallback } from "react";
import { CaptureStatus, LogEntry } from "@/lib/types";

interface StatusData extends CaptureStatus {
  logs: LogEntry[];
}

export function useStatus(pollInterval = 2000) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently retry next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  return { status: data, loading, refresh };
}
