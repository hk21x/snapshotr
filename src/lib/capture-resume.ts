import { getConfig } from "./config";
import { captureManager } from "./capture-manager";
import { logStore } from "./log-store";

// Called once at server boot (from instrumentation.ts): restart any captures
// that were running when the process last shut down.
export function resumeCaptures(): void {
  try {
    const config = getConfig();
    const ids = config.captureRunning ?? [];
    if (ids.length === 0) return;

    logStore.add("info", `Resuming ${ids.length} capture(s) after restart`);
    for (const id of ids) {
      if (id !== "default" && !config.cameras?.some((c) => c.id === id)) {
        logStore.add("warn", `[${id}] Not auto-resuming: camera no longer in config`);
        continue;
      }
      const result =
        id === "default" ? captureManager.start() : captureManager.start(id);
      if (!result.success) {
        logStore.add("warn", `[${id}] Auto-resume failed: ${result.message}`);
      }
    }
  } catch (err) {
    logStore.add("error", `Auto-resume failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
