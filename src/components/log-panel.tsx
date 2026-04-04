"use client";

import { useRef, useEffect, useState } from "react";
import { LogEntry } from "@/lib/types";
import { ChevronUp, ChevronDown } from "lucide-react";

interface LogPanelProps {
  logs: LogEntry[];
}

const levelColors: Record<LogEntry["level"], string> = {
  info: "text-green-500",
  warn: "text-yellow-500",
  error: "text-red-500",
};

export function LogPanel({ logs }: LogPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, expanded]);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString();
  }

  return (
    <div className="border-t bg-muted/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-6 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Logs</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="max-h-44 overflow-y-auto px-6 pb-3 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-muted-foreground py-2">No log entries yet.</p>
          ) : (
            logs.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className="flex gap-2.5 whitespace-nowrap">
                <span className="text-muted-foreground shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={`uppercase font-bold shrink-0 w-10 ${levelColors[entry.level]}`}>
                  {entry.level}
                </span>
                <span className="text-foreground/80 truncate">{entry.message}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
