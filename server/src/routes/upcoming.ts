import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { OPENCLAW_DIR } from "../services/paths.js";

export const upcomingRouter = Router();

interface UpcomingItem {
  title: string;
  date: string;
  daysLeft: number;
  icon: string;
  type: string;
}

upcomingRouter.get("/", async (_req, res) => {
  try {
    const items: UpcomingItem[] = [];
    const now = Date.now();

    // Parse cron jobs for future one-time events and recurring reminders
    const jobsPath = path.join(OPENCLAW_DIR, "cron", "jobs.json");
    try {
      const jobsData = JSON.parse(await fs.readFile(jobsPath, "utf-8"));
      for (const job of jobsData.jobs || []) {
        const nextMs = job.state?.nextRunAtMs;
        if (!nextMs || nextMs < now) continue;

        const daysLeft = Math.ceil((nextMs - now) / 86400000);
        const date = new Date(nextMs).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        items.push({
          title: job.name,
          date,
          daysLeft,
          icon: daysLeft < 7 ? "⚠" : "📅",
          type: job.schedule?.kind === "at" ? "one-time" : "recurring",
        });
      }
    } catch { /* ok */ }

    // Sort by days left ascending
    items.sort((a, b) => a.daysLeft - b.daysLeft);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to get upcoming items" });
  }
});
