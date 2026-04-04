export interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "HH:MM" 24hr
  endTime: string; // "HH:MM" 24hr
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface RetentionConfig {
  enabled: boolean;
  maxAgeDays: number;
  maxTotalMB: number; // 0 = unlimited
}

export interface CameraConfig {
  id: string;
  name: string;
  rtspUrl: string;
  intervalMinutes: number;
  jpegQuality: number;
  schedule: ScheduleConfig;
}

export interface CaptureConfig {
  rtspUrl: string;
  intervalMinutes: number;
  jpegQuality: number; // 1 (best) to 31 (worst), ffmpeg -q:v scale
  imageDir: string;
  discord: DiscordConfig;
  slack?: SlackConfig;
  telegram?: TelegramConfig;
  schedule: ScheduleConfig;
  retention: RetentionConfig;
  cameras?: CameraConfig[];
}

export interface CaptureStatus {
  isRunning: boolean;
  lastCapture: string | null;
  nextCapture: string | null;
  totalCaptures: number;
}

export interface MultiCameraStatus {
  [cameraId: string]: CaptureStatus;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warn";
  message: string;
}

export interface SnapshotMeta {
  filename: string;
  timestamp: string;
  sizeBytes: number;
}
