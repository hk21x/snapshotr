import { execFile, execFileSync, ChildProcess } from "child_process";
import { existsSync, statSync, statfsSync, unlinkSync, mkdirSync } from "fs";
import path from "path";
import { CaptureConfig, CaptureStatus, CameraConfig, MultiCameraStatus } from "./types";
import { logStore } from "./log-store";
import { getConfig } from "./config";
import { sendAlerts } from "./notifications";
import { cleanupSnapshots } from "./retention";

export function findFfmpeg(): string {
  const candidates = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  try {
    return execFileSync("which", ["ffmpeg"], { encoding: "utf-8" }).trim();
  } catch {
    return "ffmpeg";
  }
}

const FFMPEG_PATH = findFfmpeg();
const CAPTURE_TIMEOUT_MS = 30_000;
const MIN_DISK_SPACE_MB = 100;
const MAX_CONSECUTIVE_FAILURES = 5;
const RETRY_DELAY_MS = 5_000;

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function checkDiskSpace(dir: string): { ok: boolean; availableMB: number } {
  try {
    const stats = statfsSync(dir);
    const availableMB = (stats.bavail * stats.bsize) / (1024 * 1024);
    return { ok: availableMB >= MIN_DISK_SPACE_MB, availableMB };
  } catch {
    return { ok: true, availableMB: -1 };
  }
}

function isWithinSchedule(schedule: CaptureConfig["schedule"]): boolean {
  if (!schedule.enabled) return true;
  const now = new Date();
  if (!schedule.days.includes(now.getDay())) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = schedule.startTime.split(":").map(Number);
  const [endH, endM] = schedule.endTime.split(":").map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (start <= end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
}

interface CameraInstance {
  timer: NodeJS.Timeout | null;
  running: boolean;
  lastCapture: string | null;
  nextCapture: string | null;
  totalCaptures: number;
  activeProcess: ChildProcess | null;
  capturing: boolean;
  consecutiveFailures: number;
}

function newCameraInstance(): CameraInstance {
  return {
    timer: null,
    running: false,
    lastCapture: null,
    nextCapture: null,
    totalCaptures: 0,
    activeProcess: null,
    capturing: false,
    consecutiveFailures: 0,
  };
}

class CaptureManager {
  private instances = new Map<string, CameraInstance>();
  // Legacy single-camera instance for backward compat
  private legacy: CameraInstance = newCameraInstance();

  constructor() {
    const cleanup = () => this.stopAll();
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
  }

  private getInstance(cameraId?: string): CameraInstance {
    if (!cameraId) return this.legacy;
    let inst = this.instances.get(cameraId);
    if (!inst) {
      inst = newCameraInstance();
      this.instances.set(cameraId, inst);
    }
    return inst;
  }

  private getImageDir(config: CaptureConfig, cameraId?: string): string {
    if (!cameraId) return config.imageDir;
    return path.join(config.imageDir, cameraId);
  }

  private async alert(config: CaptureConfig, message: string) {
    sendAlerts(config, message);
  }

  private executeCaptureOnce(
    rtspUrl: string,
    jpegQuality: number,
    imageDir: string,
    inst: CameraInstance,
    config: CaptureConfig,
    label: string
  ): Promise<boolean> {
    const now = new Date();
    const filename = `snapshot_${formatTimestamp(now)}.jpg`;
    const filepath = path.join(imageDir, filename);

    return new Promise((resolve) => {
      const args = [
        "-y", "-rtsp_transport", "tcp",
        "-i", rtspUrl,
        "-frames:v", "1",
        "-q:v", String(jpegQuality),
        filepath,
        "-loglevel", "error",
      ];

      const proc = execFile(
        FFMPEG_PATH,
        args,
        { timeout: CAPTURE_TIMEOUT_MS },
        (error, _stdout, stderr) => {
          inst.activeProcess = null;

          if (error) {
            const reason = error.killed
              ? `[${label}] Capture timed out (30s)`
              : `[${label}] Capture failed: ${error.message}`;
            logStore.add("error", reason);
            this.alert(config, reason);
            if (existsSync(filepath)) unlinkSync(filepath);
            resolve(false);
            return;
          }

          if (stderr && stderr.trim()) {
            logStore.add("warn", `[${label}] ffmpeg: ${stderr.trim()}`);
          }

          if (existsSync(filepath) && statSync(filepath).size > 0) {
            const sizeKb = (statSync(filepath).size / 1024).toFixed(0);
            inst.totalCaptures++;
            inst.lastCapture = new Date().toISOString();
            logStore.add("info", `[${label}] Saved snapshot: ${filename} (${sizeKb} KB)`);
            cleanupSnapshots(config);
            resolve(true);
          } else {
            logStore.add("error", `[${label}] Capture produced empty file: ${filename}`);
            this.alert(config, `[${label}] Snapshot capture produced empty file`);
            if (existsSync(filepath)) unlinkSync(filepath);
            resolve(false);
          }
        }
      );

      inst.activeProcess = proc;
    });
  }

  private async captureWithRetry(
    rtspUrl: string,
    jpegQuality: number,
    imageDir: string,
    inst: CameraInstance,
    config: CaptureConfig,
    label: string
  ): Promise<boolean> {
    const success = await this.executeCaptureOnce(rtspUrl, jpegQuality, imageDir, inst, config, label);
    if (success) {
      inst.consecutiveFailures = 0;
      return true;
    }

    logStore.add("warn", `[${label}] Retrying capture in 5 seconds...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    const retrySuccess = await this.executeCaptureOnce(rtspUrl, jpegQuality, imageDir, inst, config, label);

    if (retrySuccess) {
      inst.consecutiveFailures = 0;
      logStore.add("info", `[${label}] Retry succeeded`);
      return true;
    }

    inst.consecutiveFailures++;
    if (inst.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const msg = `[${label}] ${inst.consecutiveFailures} consecutive capture failures`;
      logStore.add("error", msg);
      this.alert(config, msg);
      inst.consecutiveFailures = 0;
    }

    return false;
  }

  async captureOnce(config?: CaptureConfig, cameraId?: string): Promise<boolean> {
    const cfg = config ?? getConfig();
    const inst = this.getInstance(cameraId);

    if (inst.capturing) {
      logStore.add("warn", "Capture already in progress, skipping");
      return false;
    }

    inst.capturing = true;
    const imageDir = this.getImageDir(cfg, cameraId);

    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true });
    }

    const disk = checkDiskSpace(imageDir);
    if (!disk.ok) {
      const msg = `Low disk space: ${disk.availableMB.toFixed(0)} MB remaining`;
      logStore.add("error", msg);
      this.alert(cfg, msg);
      inst.capturing = false;
      return false;
    }

    // Determine camera params
    let rtspUrl = cfg.rtspUrl;
    let jpegQuality = cfg.jpegQuality;
    let label = "default";

    if (cameraId && cfg.cameras) {
      const cam = cfg.cameras.find((c) => c.id === cameraId);
      if (cam) {
        rtspUrl = cam.rtspUrl;
        jpegQuality = cam.jpegQuality;
        label = cam.name || cam.id;
      }
    }

    try {
      return await this.captureWithRetry(rtspUrl, jpegQuality, imageDir, inst, cfg, label);
    } finally {
      inst.capturing = false;
    }
  }

  start(cameraId?: string): { success: boolean; message: string } {
    const config = getConfig();

    if (cameraId && config.cameras) {
      return this.startCamera(config, cameraId);
    }

    // Legacy single-camera start
    if (this.legacy.running) {
      return { success: false, message: "Already running" };
    }

    this.legacy.running = true;
    this.legacy.consecutiveFailures = 0;
    const intervalMs = config.intervalMinutes * 60 * 1000;

    logStore.add("info", `Starting capture every ${config.intervalMinutes} minute(s)`);

    if (isWithinSchedule(config.schedule)) {
      this.captureOnce(config);
    } else {
      logStore.add("info", "Outside schedule window, waiting for next tick");
    }

    this.legacy.timer = setInterval(() => {
      const currentConfig = getConfig();
      this.legacy.nextCapture = new Date(
        Date.now() + currentConfig.intervalMinutes * 60 * 1000
      ).toISOString();
      if (isWithinSchedule(currentConfig.schedule)) {
        this.captureOnce(currentConfig);
      } else {
        logStore.add("info", "Outside schedule window, skipping capture");
      }
    }, intervalMs);

    this.legacy.nextCapture = new Date(Date.now() + intervalMs).toISOString();
    return { success: true, message: "Capture started" };
  }

  private startCamera(config: CaptureConfig, cameraId: string): { success: boolean; message: string } {
    const cam = config.cameras?.find((c) => c.id === cameraId);
    if (!cam) return { success: false, message: `Camera ${cameraId} not found` };

    const inst = this.getInstance(cameraId);
    if (inst.running) return { success: false, message: `${cam.name} already running` };

    inst.running = true;
    inst.consecutiveFailures = 0;
    const intervalMs = cam.intervalMinutes * 60 * 1000;

    logStore.add("info", `[${cam.name}] Starting capture every ${cam.intervalMinutes} minute(s)`);

    if (isWithinSchedule(cam.schedule)) {
      this.captureOnce(config, cameraId);
    } else {
      logStore.add("info", `[${cam.name}] Outside schedule window`);
    }

    inst.timer = setInterval(() => {
      const currentConfig = getConfig();
      const currentCam = currentConfig.cameras?.find((c) => c.id === cameraId);
      if (!currentCam) return;
      inst.nextCapture = new Date(Date.now() + currentCam.intervalMinutes * 60 * 1000).toISOString();
      if (isWithinSchedule(currentCam.schedule)) {
        this.captureOnce(currentConfig, cameraId);
      } else {
        logStore.add("info", `[${currentCam.name}] Outside schedule window, skipping`);
      }
    }, intervalMs);

    inst.nextCapture = new Date(Date.now() + intervalMs).toISOString();
    return { success: true, message: `${cam.name} capture started` };
  }

  startAll(): { started: string[]; failed: string[] } {
    const config = getConfig();
    const started: string[] = [];
    const failed: string[] = [];

    if (!config.cameras || config.cameras.length === 0) {
      // Legacy mode
      const result = this.start();
      if (result.success) started.push("default");
      else failed.push("default");
      return { started, failed };
    }

    for (const cam of config.cameras) {
      const result = this.startCamera(config, cam.id);
      if (result.success) started.push(cam.id);
      else failed.push(cam.id);
    }
    return { started, failed };
  }

  stop(cameraId?: string): { success: boolean; message: string } {
    if (cameraId) {
      return this.stopCamera(cameraId);
    }

    // Legacy stop
    if (!this.legacy.running) {
      return { success: false, message: "Not running" };
    }

    if (this.legacy.timer) {
      clearInterval(this.legacy.timer);
      this.legacy.timer = null;
    }
    if (this.legacy.activeProcess) {
      this.legacy.activeProcess.kill("SIGTERM");
      this.legacy.activeProcess = null;
    }

    this.legacy.running = false;
    this.legacy.capturing = false;
    this.legacy.nextCapture = null;
    logStore.add("info", "Capture stopped");
    return { success: true, message: "Capture stopped" };
  }

  private stopCamera(cameraId: string): { success: boolean; message: string } {
    const inst = this.instances.get(cameraId);
    if (!inst || !inst.running) {
      return { success: false, message: `Camera ${cameraId} not running` };
    }

    if (inst.timer) {
      clearInterval(inst.timer);
      inst.timer = null;
    }
    if (inst.activeProcess) {
      inst.activeProcess.kill("SIGTERM");
      inst.activeProcess = null;
    }

    inst.running = false;
    inst.capturing = false;
    inst.nextCapture = null;
    logStore.add("info", `[${cameraId}] Capture stopped`);
    return { success: true, message: `Camera ${cameraId} stopped` };
  }

  stopAll(): void {
    this.stop();
    for (const id of this.instances.keys()) {
      this.stopCamera(id);
    }
  }

  getStatus(cameraId?: string): CaptureStatus {
    const inst = cameraId ? this.instances.get(cameraId) : this.legacy;
    if (!inst) {
      return { isRunning: false, lastCapture: null, nextCapture: null, totalCaptures: 0 };
    }
    return {
      isRunning: inst.running,
      lastCapture: inst.lastCapture,
      nextCapture: inst.nextCapture,
      totalCaptures: inst.totalCaptures,
    };
  }

  getAllStatuses(): MultiCameraStatus {
    const result: MultiCameraStatus = {};
    // Include legacy if it has been used
    if (this.legacy.running || this.legacy.totalCaptures > 0) {
      result["default"] = this.getStatus();
    }
    for (const [id] of this.instances) {
      result[id] = this.getStatus(id);
    }
    return result;
  }

  getCameraIds(): string[] {
    return Array.from(this.instances.keys());
  }
}

const globalForCapture = globalThis as unknown as {
  captureManager: CaptureManager;
};
export const captureManager =
  globalForCapture.captureManager ?? new CaptureManager();
if (process.env.NODE_ENV !== "production") {
  globalForCapture.captureManager = captureManager;
}
