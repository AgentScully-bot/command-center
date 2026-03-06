import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR, OPENCLAW_DIR } from "../services/paths.js";

export const activityRouter = Router();

interface ActivityItem {
  type: string;
  title: string;
  detail: string;
  time: string;
  icon: string;
  color: string;
}

activityRouter.get("/", async (_req, res) => {
  try {
    const activities: ActivityItem[] = [];

    // Scan recent memory files across projects
    const projectDirs = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    for (const entry of projectDirs) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "_template") continue;
      const memDir = path.join(PROJECTS_DIR, entry.name, "memory");
      try {
        const files = await fs.readdir(memDir);
        const recent = files.filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 3);
        for (const file of recent) {
          const content = await fs.readFile(path.join(memDir, file), "utf-8");
          const lines = content.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("* "));
          for (const line of lines.slice(0, 3)) {
            const text = line.replace(/^[-*]\s+/, "").trim();
            if (!text) continue;
            activities.push({
              type: "memory",
              title: text.split(" — ")[0] || text.slice(0, 60),
              detail: entry.name,
              time: file.replace(".md", ""),
              icon: "✎",
              color: "blue",
            });
          }
        }
      } catch { /* no memory dir */ }
    }

    // Check cron run history
    const runsDir = path.join(OPENCLAW_DIR, "cron", "runs");
    try {
      const runFiles = (await fs.readdir(runsDir)).sort().reverse().slice(0, 10);
      for (const rf of runFiles) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(runsDir, rf), "utf-8"));
          activities.push({
            type: "cron",
            title: data.jobName || data.name || "Cron job",
            detail: data.error ? `Failed: ${data.error}` : "Completed",
            time: data.ts || data.startedAt || rf.replace(".json", ""),
            icon: data.error ? "✗" : "✓",
            color: data.error ? "red" : "green",
          });
        } catch { /* skip */ }
      }
    } catch { /* no runs */ }

    // Sort by time desc
    activities.sort((a, b) => b.time.localeCompare(a.time));

    res.json(activities.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: "Failed to get activity" });
  }
});
