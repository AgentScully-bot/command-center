import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { OPENCLAW_DIR } from "../services/paths.js";

export const heartbeatRouter = Router();

interface HeartbeatLogEntry {
  "0"?: string;
  "1"?: { intervalMs?: number };
  "2"?: string;
  time?: string;
  message?: string;
  intervalMs?: number;
}

interface ActiveHours {
  start: string;
  end: string;
  timezone: string;
}

function getLogPath(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `/tmp/openclaw/openclaw-${yyyy}-${mm}-${dd}.log`;
}

async function findLastHeartbeat(logPath: string): Promise<{ lastFiredAt: string; intervalMs: number } | null> {
  let content: string;
  try {
    content = await fs.readFile(logPath, "utf-8");
  } catch {
    return null;
  }

  let result: { lastFiredAt: string; intervalMs: number } | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry: HeartbeatLogEntry = JSON.parse(trimmed);
      const message = entry["2"] ?? entry.message ?? "";
      if (message === "heartbeat: started") {
        const time = entry.time;
        const intervalMs = entry["1"]?.intervalMs ?? entry.intervalMs;
        if (time && intervalMs) {
          result = { lastFiredAt: time, intervalMs };
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  return result;
}

function isWithinActiveHours(activeHours: ActiveHours): boolean {
  const { start, end, timezone } = activeHours;

  // Get current time in the configured timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const currentMinutes = hour * 60 + minute;

  const [startHour, startMin] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);
  const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
  const endMinutes = (endHour ?? 23) * 60 + (endMin ?? 0);

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

heartbeatRouter.get("/", async (_req, res) => {
  try {
    const now = new Date();
    const today = new Date(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Try today's log, then yesterday's
    let heartbeat = await findLastHeartbeat(getLogPath(today));
    if (!heartbeat) {
      heartbeat = await findLastHeartbeat(getLogPath(yesterday));
    }

    // Read active hours config
    let withinActiveHours = true;
    try {
      const configPath = path.join(OPENCLAW_DIR, "openclaw.json");
      const configContent = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);
      const activeHours: ActiveHours | undefined =
        config?.agents?.defaults?.heartbeat?.activeHours ??
        config?.heartbeat?.activeHours;
      if (activeHours?.start && activeHours?.end && activeHours?.timezone) {
        withinActiveHours = isWithinActiveHours(activeHours);
      }
    } catch {
      // Config unreadable — assume within active hours
    }

    if (!heartbeat) {
      return res.json({
        lastFiredAt: null,
        intervalMs: 1800000,
        nextExpectedAt: null,
        secondsRemaining: null,
        isOverdue: false,
        withinActiveHours,
      });
    }

    const lastFiredAt = heartbeat.lastFiredAt;
    const intervalMs = heartbeat.intervalMs;
    const nextExpectedAt = new Date(new Date(lastFiredAt).getTime() + intervalMs);
    const secondsRemaining = Math.round((nextExpectedAt.getTime() - now.getTime()) / 1000);

    return res.json({
      lastFiredAt,
      intervalMs,
      nextExpectedAt: nextExpectedAt.toISOString(),
      secondsRemaining,
      isOverdue: secondsRemaining < 0,
      withinActiveHours,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get heartbeat status" });
  }
});
