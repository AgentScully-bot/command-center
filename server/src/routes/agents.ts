import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { OPENCLAW_DIR } from "../services/paths.js";
import { run } from "../services/shell.js";

export const agentsRouter = Router();

const TRACKER_PATH = process.env.AGENT_TRACKER || path.join(
  process.env.HOME || "/tmp",
  "deployments/command-center/agent-tracker.json"
);

interface SessionData {
  sessionId: string;
  updatedAt: number;
  label?: string;
  chatType?: string;
  model?: string;
  modelProvider?: string;
  abortedLastRun?: boolean | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheRead?: number;
}

interface AgentEntry {
  sessionKey: string;
  label: string;
  model: string;
  modelProvider: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  totalTokens: number;
  updatedAt: number;
  startedAt?: number;
  duration?: number;
  status: "running" | "completed" | "errored" | "stale";
  chatType: string;
  project?: string;
  pid?: number;
  source: "openclaw" | "tracker";
}

// Check if a PID is still running
function isProcessRunning(pid: number): boolean {
  if (!pid || pid <= 0) return false;  // pid=0 signals the process group — never use it
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

agentsRouter.get("/", async (_req, res) => {
  try {
    const agents: AgentEntry[] = [];

    // Source 1: OpenClaw sessions (cron, sub-agents)
    const sessionsPath = path.join(OPENCLAW_DIR, "agents", "main", "sessions", "sessions.json");
    try {
      const sessionsData: Record<string, SessionData> = JSON.parse(
        await fs.readFile(sessionsPath, "utf-8")
      );

      for (const [key, session] of Object.entries(sessionsData)) {
        const isCron = key.includes(":cron:");
        const isSubAgent = session.chatType === "subagent";
        const isMainDirect =
          key === "agent:main:main" ||
          (session.chatType === "direct" && !isSubAgent) ||
          session.chatType === "group";

        if (isMainDirect && !isCron) continue;

        let status: AgentEntry["status"] = "completed";
        if (session.abortedLastRun === true) {
          status = "errored";
        } else if (session.abortedLastRun === null || session.abortedLastRun === undefined) {
          const ageMs = Date.now() - (session.updatedAt || 0);
          status = ageMs < 5 * 60 * 1000 ? "running" : "completed";
        }

        agents.push({
          sessionKey: key,
          label: session.label || key.split(":").slice(-1)[0] || key,
          model: session.model || "unknown",
          modelProvider: session.modelProvider || "unknown",
          inputTokens: session.inputTokens || 0,
          outputTokens: session.outputTokens || 0,
          cacheRead: session.cacheRead || 0,
          totalTokens: session.totalTokens || 0,
          updatedAt: session.updatedAt || 0,
          status,
          chatType: isCron ? "cron" : session.chatType || "unknown",
          source: "openclaw",
        });
      }
    } catch { /* sessions file may not exist */ }

    // Source 2: Agent tracker (coding agents spawned via exec)
    try {
      const trackerData = JSON.parse(await fs.readFile(TRACKER_PATH, "utf-8"));
      if (trackerData.agents && Array.isArray(trackerData.agents)) {
        const now = Date.now();
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        const EIGHT_HOURS = 8 * 60 * 60 * 1000;
        const corrections: Array<{ id: string; status: string; completedAt: number; error?: string }> = [];

        for (const agent of trackerData.agents) {
          let status: AgentEntry["status"] = agent.status || "completed";
          const startedAt = agent.startedAt || 0;
          const age = now - startedAt;

          if (status === "running") {
            const pid: number | undefined = agent.pid;

            // Correction 1: valid PID but process is dead
            if (pid != null && pid > 0 && !isProcessRunning(pid)) {
              status = "completed";
              corrections.push({ id: agent.id, status: "completed", completedAt: now });
            }
            // Correction 2: no valid PID — age-based timeout
            else if (pid == null || pid === 0) {
              if (age >= FOUR_HOURS) {
                status = "stale";
                corrections.push({ id: agent.id, status: "stale", completedAt: now, error: "Auto-stale: no PID, age ≥ 4h" });
              }
              // else stay running
            }

            // Correction 3: any running entry older than 8h
            if (status === "running" && age >= EIGHT_HOURS) {
              status = "completed";
              corrections.push({ id: agent.id, status: "completed", completedAt: now });
            }
          }

          const endedAt = agent.completedAt || now;
          const duration = startedAt ? endedAt - startedAt : undefined;

          agents.push({
            sessionKey: agent.id || `tracker-${agent.startedAt}`,
            label: agent.task || "Coding agent",
            model: agent.model || "claude-code",
            modelProvider: agent.provider || "anthropic",
            inputTokens: 0,
            outputTokens: 0,
            cacheRead: 0,
            totalTokens: 0,
            updatedAt: agent.completedAt || agent.startedAt || 0,
            startedAt,
            duration,
            status,
            chatType: "coding",
            project: agent.project,
            pid: agent.pid,
            source: "tracker",
          });
        }

        // Write corrections back to disk atomically
        if (corrections.length > 0) {
          try {
            const fresh = JSON.parse(await fs.readFile(TRACKER_PATH, "utf-8"));
            const corrMap = new Map(corrections.map(c => [c.id, c]));
            for (const a of fresh.agents) {
              const corr = corrMap.get(a.id);
              if (corr) {
                a.status = corr.status;
                a.completedAt = corr.completedAt;
                if (corr.error) a.error = corr.error;
              }
            }
            const tmpPath = TRACKER_PATH + ".tmp." + process.pid;
            await fs.writeFile(tmpPath, JSON.stringify(fresh, null, 2));
            await fs.rename(tmpPath, TRACKER_PATH);
          } catch { /* best-effort write-back */ }
        }
      }
    } catch { /* tracker may not exist */ }

    // Infer project for agents that don't have one set
    const projectsDir = path.join(process.env.HOME || "/tmp", "projects");
    let knownProjects: string[] = [];
    try {
      const entries = await fs.readdir(projectsDir, { withFileTypes: true });
      knownProjects = entries
        .filter(e => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
        .map(e => e.name);
    } catch { /* ok */ }

    for (const a of agents) {
      if (!a.project && a.label) {
        const labelLower = a.label.toLowerCase();
        for (const proj of knownProjects) {
          if (labelLower.includes(proj)) {
            a.project = proj;
            break;
          }
        }
      }
    }

    agents.sort((a, b) => b.updatedAt - a.updatedAt);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: "Failed to get agents" });
  }
});
