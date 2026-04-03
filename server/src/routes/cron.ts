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
  nextRunAt: number | null;
  lastRunAt: number | null;
  lastStatus: string;
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
    const lastRunMap = new Map<string, { status: string; timeMs: number | null }>();
    for (const rf of runFiles.sort().reverse()) {
      try {
        const runData = JSON.parse(await fs.readFile(path.join(runsDir, rf), "utf-8"));
        const jobId = runData.jobId || runData.id;
        if (jobId && !lastRunMap.has(jobId)) {
          const tsStr = runData.ts || runData.startedAt || null;
          const timeMs = tsStr ? new Date(tsStr).getTime() : null;
          lastRunMap.set(jobId, {
            status: runData.error ? "error" : "ok",
            timeMs: isNaN(timeMs as number) ? null : timeMs,
          });
        }
      } catch { /* skip bad files */ }
    }

    for (const job of jobsData.jobs || []) {
      const schedExpr = job.schedule?.expr || (job.schedule?.at ? `at ${job.schedule.at}` : "unknown");
      const nextRunAt: number | null = job.state?.nextRunAtMs ?? null;

      const lastRun = lastRunMap.get(job.id);

      jobs.push({
        id: job.id,
        name: job.name || "unnamed",
        schedule: formatSchedule(schedExpr, job.schedule),
        nextRunAt,
        lastRunAt: lastRun?.timeMs ?? null,
        lastStatus: lastRun?.status || (job.state?.lastError ? "error" : "ok"),
        enabled: job.enabled !== false,
      });
    }

    // Also parse CLI output for extra status info
    try {
      const cliOutput = await run("openclaw", ["cron", "list"], 3000);
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


