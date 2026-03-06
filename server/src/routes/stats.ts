import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { OPENCLAW_DIR } from "../services/paths.js";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res) => {
  try {
    // Read session data from openclaw agents directory
    const sessionsDir = path.join(OPENCLAW_DIR, "agents", "main", "sessions");
    let sessionFiles: string[] = [];
    try {
      sessionFiles = await fs.readdir(sessionsDir);
    } catch { /* no sessions dir */ }

    // Read completions for cost/token data
    const completionsDir = path.join(OPENCLAW_DIR, "completions");
    let costToday = 0;
    let costMonth = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    let sessionsToday = 0;
    const dailyCosts: { date: string; cost: number }[] = [];

    try {
      const files = await fs.readdir(completionsDir);
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);

      // Group costs by day for the last 14 days
      const dayMap = new Map<string, number>();

      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const content = await fs.readFile(path.join(completionsDir, file), "utf-8");
        for (const line of content.split("\n").filter(Boolean)) {
          try {
            const entry = JSON.parse(line);
            const date = (entry.ts || entry.timestamp || "").slice(0, 10);
            const inTokens = entry.usage?.input_tokens || entry.inputTokens || 0;
            const outTokens = entry.usage?.output_tokens || entry.outputTokens || 0;
            const cost = entry.cost || ((inTokens * 15 + outTokens * 75) / 1_000_000);

            if (date === todayStr) {
              tokensIn += inTokens;
              tokensOut += outTokens;
              costToday += cost;
              sessionsToday++;
            }
            if (date.startsWith(monthStr)) {
              costMonth += cost;
            }
            dayMap.set(date, (dayMap.get(date) || 0) + cost);
          } catch { /* skip bad lines */ }
        }
      }

      // Build last 14 days array
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        dailyCosts.push({ date: ds, cost: dayMap.get(ds) || 0 });
      }
    } catch { /* no completions data */ }

    // If no completions data, generate placeholder daily costs
    if (dailyCosts.length === 0) {
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dailyCosts.push({ date: d.toISOString().slice(0, 10), cost: 0 });
      }
    }

    // Get uptime from systemd
    let uptime = "";
    try {
      const { execFileSync } = await import("child_process");
      const result = execFileSync("systemctl", ["show", "openclaw-gateway", "--property=ActiveEnterTimestamp"], { encoding: "utf-8" });
      const match = result.match(/=(.+)/);
      if (match) {
        const started = new Date(match[1]);
        const diff = Date.now() - started.getTime();
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        uptime = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      }
    } catch {
      uptime = "N/A";
    }

    res.json({
      uptime,
      sessionsToday,
      costToday: Math.round(costToday * 100) / 100,
      costMonth: Math.round(costMonth * 100) / 100,
      tokensIn,
      tokensOut,
      activeErrors: 0,
      dailyCosts,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});
