import { LogEntry } from "./types";

class LogStore {
  private entries: LogEntry[] = [];
  private readonly maxEntries = 200;

  add(level: LogEntry["level"], message: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  getAll(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

const globalForLog = globalThis as unknown as { logStore: LogStore };
export const logStore = globalForLog.logStore ?? new LogStore();
if (process.env.NODE_ENV !== "production") {
  globalForLog.logStore = logStore;
}
