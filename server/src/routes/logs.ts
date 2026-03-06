import { Router, type Request } from "express";
import { run } from "../services/shell.js";
import fs from "fs/promises";

export const logsRouter = Router();

interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  source: string;
}

// Only these patterns are worth showing
const IMPORTANT_PATTERNS: Array<{ pattern: RegExp; level: "error" | "warn" | "info" }> = [
  // Errors and failures
  { pattern: /isError=true/i, level: "error" },
  { pattern: /overloaded/i, level: "error" },
  { pattern: /\berror[=:\s]/i, level: "error" },
  { pattern: /\bfailed\b/i, level: "error" },
  { pattern: /\bcrash/i, level: "error" },
  { pattern: /ECONNREFUSED|ECONNRESET|ETIMEDOUT/i, level: "error" },
  { pattern: /status\s*[45]\d\d/i, level: "error" },
  // Warnings
  { pattern: /\[WARN\]/i, level: "warn" },
  { pattern: /\btimeout\b/i, level: "warn" },
  { pattern: /\bretry/i, level: "warn" },
  { pattern: /\bdisconnect/i, level: "warn" },
  { pattern: /token.*expir/i, level: "warn" },
  { pattern: /auth.*fail/i, level: "error" },
  // Recovery and reconnection
  { pattern: /\breconnect/i, level: "info" },
  { pattern: /\brecovery\b/i, level: "info" },
  { pattern: /\bresumed?\b/i, level: "info" },
  // Agent lifecycle
  { pattern: /agent.*(?:start|spawn|begin)/i, level: "info" },
  { pattern: /agent.*(?:end|complet|finish|done)/i, level: "info" },
  { pattern: /embedded run agent/i, level: "info" },
  { pattern: /sub-?agent/i, level: "info" },
  // Service lifecycle
  { pattern: /gateway.*(?:start|stop|restart)/i, level: "info" },
  { pattern: /\bstarting\b.*service/i, level: "info" },
];

function classifyLine(line: string): { level: "error" | "warn" | "info"; important: boolean } {
  for (const { pattern, level } of IMPORTANT_PATTERNS) {
    if (pattern.test(line)) {
      return { level, important: true };
    }
  }
  return { level: "info", important: false };
}

function parseSinceToSeconds(since: string): number {
  const match = since.match(/^(\d+)([smhd])$/);
  if (!match) return 3600;
  const n = parseInt(match[1]!, 10);
  const unit = match[2]!;
  switch (unit) {
    case "s": return n;
    case "m": return n * 60;
    case "h": return n * 3600;
    case "d": return n * 86400;
    default: return 3600;
  }
}

function parseJournalLine(line: string): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const { level, important } = classifyLine(trimmed);
  if (!important) return null;

  const match = trimmed.match(/^(\w{3}\s+\d{2}\s+\d{2}:\d{2}:\d{2})\s+\S+\s+\S+:\s+(.*)$/);
  if (match) {
    return { timestamp: match[1]!, level, message: match[2]!, source: "gateway" };
  }
  return { timestamp: "", level, message: trimmed, source: "gateway" };
}

function parseFileLine(line: string): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const { level, important } = classifyLine(trimmed);
  if (!important) return null;

  const tsMatch = trimmed.match(/^[\[(]?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\])]*)[\])]?\s*(.*)$/);
  if (tsMatch) {
    return { timestamp: tsMatch[1]!, level, message: tsMatch[2]!, source: "log" };
  }
  return { timestamp: "", level, message: trimmed, source: "log" };
}

logsRouter.get("/", async (req: Request, res) => {
  try {
    const levelFilter = req.query.level as string | undefined;
    const limit = parseInt((req.query.limit as string) || "100", 10);
    const since = (req.query.since as string) || "6h";

    const entries: LogEntry[] = [];

    // Source 1: journalctl
    try {
      const sinceSeconds = parseSinceToSeconds(since);
      const stdout = await run("journalctl", [
        "--user", "-u", "openclaw-gateway",
        "--no-pager", "-n", "1000",
        `--since=${sinceSeconds} seconds ago`,
      ]);
      for (const line of stdout.split("\n")) {
        const entry = parseJournalLine(line);
        if (entry) entries.push(entry);
      }
    } catch { /* journalctl may not have data */ }

    // Source 2: today's file log
    try {
      const today = new Date().toISOString().slice(0, 10);
      const logPath = `/tmp/openclaw/openclaw-${today}.log`;
      const content = await fs.readFile(logPath, "utf-8");
      for (const line of content.split("\n")) {
        const entry = parseFileLine(line);
        if (entry) entries.push(entry);
      }
    } catch { /* file may not exist */ }

    // Deduplicate similar messages within 5 seconds
    const deduped: LogEntry[] = [];
    for (const entry of entries) {
      const isDupe = deduped.some(
        (e) => e.message === entry.message && e.timestamp === entry.timestamp
      );
      if (!isDupe) deduped.push(entry);
    }

    // Filter by level
    let filtered = deduped;
    if (levelFilter && levelFilter !== "all") {
      filtered = deduped.filter((e) => e.level === levelFilter);
    }

    // Newest first, apply limit
    filtered.reverse();
    res.json(filtered.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: "Failed to get logs" });
  }
});
