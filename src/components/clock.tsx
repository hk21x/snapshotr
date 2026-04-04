"use client";

import { useState, useEffect } from "react";

export function Clock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
  );
}
