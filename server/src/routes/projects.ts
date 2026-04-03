import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { PROJECTS_DIR } from "../services/paths.js";
import { parseTasksFile, parseProjectMd } from "../services/markdown.js";

export const projectsRouter = Router();

const SKIP_DIRS = ["_template", "ideas", "memory"];

projectsRouter.get("/", async (_req, res) => {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects = [];

    // Parse master PROJECTS.md for status info
    let masterIndex = "";
    try {
      masterIndex = await fs.readFile(path.join(PROJECTS_DIR, "PROJECTS.md"), "utf-8");
    } catch { /* ok */ }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.includes(entry.name) || entry.name.startsWith(".")) continue;

      const projDir = path.join(PROJECTS_DIR, entry.name);
      const projectMd = await parseProjectMd(path.join(projDir, "PROJECT.md"));
      const tasks = await parseTasksFile(path.join(projDir, "TASKS.md"));

      // Check master index for status
      const masterMatch = masterIndex.match(new RegExp(`###\\s+${entry.name}[\\s\\S]*?Status:\\s*(\\w+)`, "i"));
      const status = masterMatch ? masterMatch[1].toLowerCase() : projectMd.status;

      // Calculate progress percentage
      const progress = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;

      projects.push({
        id: entry.name,
        name: projectMd.name,
        description: projectMd.description,
        status,
        tasks: {
          total: tasks.total,
          done: tasks.done,
          todo: tasks.todo,
          inProgress: tasks.inProgress,
          blocked: tasks.blocked,
          approved: tasks.approved,
          planned: tasks.planned,
          activeTotal: tasks.activeTotal,
        },
        progress,
      });
    }

    // Sort: active first, then by progress desc
    projects.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return b.progress - a.progress;
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to get projects" });
  }
});
