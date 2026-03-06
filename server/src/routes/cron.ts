import { Router } from "express";
import { run } from "../services/shell.js";
import fs from "fs/promises";
import path from "path";
import { OPENCLAW_DIR } from "../services/paths.js";

export const cronRouter = Router();

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  lastStatus: string;
  nextRun: string;
  enabled: boolean;
}

cronRouter.get("/", async (_req, res) => {
  try {
    // Try parsing the cron jobs JSON directly
    const jobsPath = path.join(OPENCLAW_DIR, "cron", "jobs.json");
    const jobsData = JSON.parse(await fs.readFile(jobsPath, "utf-8"));
    const jobs: CronJob[] = [];

    // Also try to get run history
    const runsDir = path.join(OPENCLAW_DIR, "cron", "runs");
    let runFiles: string[] = [];
    try {
      runFiles = await fs.readdir(runsDir);
    } catch { /* no runs dir */ }

    // Build last-run map from run files
    const lastRunMap = new Map<string, { status: string; time: string }>();
    for (const rf of runFiles.sort().reverse()) {
      try {
        const runData = JSON.parse(await fs.readFile(path.join(runsDir, rf), "utf-8"));
        const jobId = runData.jobId || runData.id;
        if (jobId && !lastRunMap.has(jobId)) {
          lastRunMap.set(jobId, {
            status: runData.error ? "error" : "ok",
            time: runData.ts || runData.startedAt || rf.replace(".json", ""),
          });
        }
      } catch { /* skip bad files */ }
    }

    for (const job of jobsData.jobs || []) {
      const schedExpr = job.schedule?.expr || (job.schedule?.at ? `at ${job.schedule.at}` : "unknown");
      const nextRunMs = job.state?.nextRunAtMs;
      const nextRun = nextRunMs ? formatRelativeTime(nextRunMs) : "—";

      // Check CLI output for last run
      const lastRun = lastRunMap.get(job.id);

      jobs.push({
        id: job.id,
        name: job.name || "unnamed",
        schedule: formatSchedule(schedExpr, job.schedule),
        lastRun: lastRun?.time ? formatTimeShort(lastRun.time) : "—",
        lastStatus: lastRun?.status || (job.state?.lastError ? "error" : "ok"),
        nextRun,
        enabled: job.enabled !== false,
      });
    }

    // Also parse CLI output for extra status info
    try {
      const cliOutput = await run("openclaw", ["cron", "list"]);
      const lines = cliOutput.split("\n");
      for (const line of lines) {
        // Match table rows: ID Name Schedule Next Last Status
        const match = line.match(/^(\S{36})\s+(.+?)\s{2,}(.+?)\s{2,}(.+?)\s{2,}(.+?)\s{2,}(\w+)/);
        if (match) {
          const existing = jobs.find((j) => j.id === match[1]);
          if (existing) {
            if (match[6] === "error") existing.lastStatus = "error";
          }
        }
      }
    } catch { /* CLI not available */ }

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to get cron jobs" });
  }
});

function formatSchedule(expr: string, schedule: { kind: string; at?: string; expr?: string; tz?: string }): string {
  if (schedule.kind === "at" && schedule.at) {
    return `Once: ${new Date(schedule.at).toLocaleDateString()}`;
  }
  return expr;
}

function formatRelativeTime(ms: number): string {
  const diff = ms - Date.now();
  if (diff < 0) return "Overdue";
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  return `in ${Math.floor(diff / 60000)}m`;
}

function formatTimeShort(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return ts;
  }
}
