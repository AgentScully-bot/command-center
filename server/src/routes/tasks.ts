import { Router } from "express";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR } from "../services/paths.js";
import { broadcast } from "../ws.js";

export const tasksRouter = Router();
tasksRouter.use(express.json());

const SKIP_DIRS = ["_template", "ideas", "memory"];

interface PlannedTask {
  project: string;
  section: string;
  task: string;
  line: string;
}

tasksRouter.get("/planned", async (_req, res) => {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const planned: PlannedTask[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.includes(entry.name) || entry.name.startsWith(".")) continue;

      const tasksPath = path.join(PROJECTS_DIR, entry.name, "TASKS.md");
      let content: string;
      try {
        content = await fs.readFile(tasksPath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      let inPlanned = false;
      let subsection = "";

      for (const line of lines) {
        const h2 = line.match(/^##\s+(.+)/);
        if (h2) {
          inPlanned = h2[1].includes("Planned");
          subsection = "";
          continue;
        }

        if (inPlanned) {
          const h3 = line.match(/^###\s+(.+)/);
          if (h3) {
            subsection = h3[1].trim();
            continue;
          }

          const taskMatch = line.match(/^- \[[ ]\]\s+(.+)/);
          if (taskMatch) {
            planned.push({
              project: entry.name,
              section: subsection,
              task: taskMatch[1].trim(),
              line: line,
            });
          }
        }
      }
    }

    res.json(planned);
  } catch (err) {
    res.status(500).json({ error: "Failed to get planned tasks" });
  }
});

tasksRouter.post("/approve", async (req, res) => {
  try {
    const { project, task } = req.body as { project: string; task: string };

    if (!project || !task) {
      res.status(400).json({ error: "Missing project or task" });
      return;
    }

    // Sanitize project name to prevent path traversal
    if (project.includes("..") || project.includes("/")) {
      res.status(400).json({ error: "Invalid project name" });
      return;
    }

    const tasksPath = path.join(PROJECTS_DIR, project, "TASKS.md");
    let content: string;
    try {
      content = await fs.readFile(tasksPath, "utf-8");
    } catch {
      res.status(404).json({ error: "TASKS.md not found for project" });
      return;
    }

    const lines = content.split("\n");
    let plannedStart = -1;
    let approvedStart = -1;
    let approvedInsertIdx = -1;
    let taskLineIdx = -1;
    let inPlanned = false;

    for (let i = 0; i < lines.length; i++) {
      const h2 = lines[i].match(/^##\s+(.+)/);
      if (h2) {
        if (h2[1].includes("Planned")) {
          plannedStart = i;
          inPlanned = true;
        } else {
          inPlanned = false;
        }
        if (h2[1].includes("Approved")) {
          approvedStart = i;
        }
        continue;
      }

      // Find the task line in Planned section
      if (inPlanned && taskLineIdx === -1) {
        const taskMatch = lines[i].match(/^- \[[ ]\]\s+(.+)/);
        if (taskMatch && taskMatch[1].trim() === task) {
          taskLineIdx = i;
        }
      }
    }

    if (taskLineIdx === -1) {
      res.status(404).json({ error: "Task not found in Planned section" });
      return;
    }

    if (approvedStart === -1) {
      res.status(404).json({ error: "No Approved section found" });
      return;
    }

    // Find the end of the Approved section (last non-empty line before next ## or end)
    approvedInsertIdx = approvedStart + 1;
    for (let i = approvedStart + 1; i < lines.length; i++) {
      if (lines[i].match(/^##\s+/)) break;
      approvedInsertIdx = i + 1;
    }

    // Remove from planned
    const taskLine = lines[taskLineIdx];
    lines.splice(taskLineIdx, 1);

    // Adjust insert index if it was after the removed line
    if (approvedInsertIdx > taskLineIdx) {
      approvedInsertIdx--;
    }

    // Insert at end of Approved section
    lines.splice(approvedInsertIdx, 0, taskLine);

    await fs.writeFile(tasksPath, lines.join("\n"), "utf-8");
    broadcast('tasks'); broadcast('projects');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve task" });
  }
});
