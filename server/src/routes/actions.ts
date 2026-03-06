import { Router } from "express";
import express from "express";
import { run } from "../services/shell.js";
import { broadcast } from "../ws.js";

export const actionsRouter = Router();
actionsRouter.use(express.json());

actionsRouter.post("/restart-gateway", async (_req, res) => {
  try {
    const output = await run("openclaw", ["gateway", "restart"], 15000);
    broadcast('logs');
    res.json({ ok: true, output: output.trim() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to restart gateway" });
  }
});

actionsRouter.post("/run-cron", async (req, res) => {
  try {
    const { id } = req.body as { id: string };
    if (!id) {
      res.status(400).json({ error: "Missing cron job id" });
      return;
    }
    // Validate UUID format to prevent injection
    if (!/^[\w-]+$/.test(id)) {
      res.status(400).json({ error: "Invalid cron job id" });
      return;
    }
    const output = await run("openclaw", ["cron", "run", id], 60000);
    res.json({ ok: true, output: output.trim() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to run cron job" });
  }
});

actionsRouter.post("/kill-agent", async (req, res) => {
  try {
    const { sessionId } = req.body as { sessionId: string };
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId" });
      return;
    }
    // Validate session ID format
    if (!/^[\w:.-]+$/.test(sessionId)) {
      res.status(400).json({ error: "Invalid sessionId" });
      return;
    }
    const output = await run("openclaw", ["agent", "kill", sessionId], 15000);
    broadcast('agents');
    res.json({ ok: true, output: output.trim() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to kill agent" });
  }
});
