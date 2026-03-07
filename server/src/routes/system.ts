import { Router } from "express";
import { run } from "../services/shell.js";

export const systemRouter = Router();

systemRouter.get("/", async (_req, res) => {
  try {
    const text = await run("openclaw", ["status"], 8000).catch(() => "");

    // Gateway service: look for "running" in Gateway service line
    const gatewayRunning = text.includes("running");

    // Channels: parse the channels table
    const channels: Record<string, string> = {};
    const channelMatch = text.match(/│\s*Telegram\s*│\s*(\w+)\s*│\s*(\w+)/);
    if (channelMatch) {
      const state = channelMatch[2].toLowerCase();
      channels["telegram"] = state === "warn" ? "warn" : state === "ok" || channelMatch[1] === "ON" ? "ok" : "error";
    }

    // Sessions count: "sessions X" or "X active"
    const sessionsMatch = text.match(/sessions?\s+(\d+)\s+active/i) || text.match(/(\d+)\s+active/);
    const sessions = sessionsMatch ? parseInt(sessionsMatch[1]) : 0;

    // Version
    const versionMatch = text.match(/app\s+([\d.]+)/);

    // Update available
    const updateAvailable = text.includes("Update available") || text.includes("update") && text.includes("available");

    res.json({
      gateway: gatewayRunning ? "ok" : "unknown",
      gatewayService: gatewayRunning ? "running" : "stopped",
      channels,
      sessions,
      version: versionMatch?.[1] || "unknown",
      update: updateAvailable,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get system status" });
  }
});
