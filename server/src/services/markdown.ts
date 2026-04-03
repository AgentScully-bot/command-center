import fs from "fs/promises";

export interface TaskCounts {
  todo: number;
  inProgress: number;
  done: number;
  blocked: number;
  approved: number;
  planned: number;
  total: number;
  activeTotal: number; // excludes Done
  items: TaskItem[];
}

export interface TaskItem {
  text: string;
  section: string;
  done: boolean;
  waiting: string | null;
}

export async function parseTasksFile(filePath: string): Promise<TaskCounts> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return { todo: 0, inProgress: 0, done: 0, blocked: 0, approved: 0, planned: 0, total: 0, activeTotal: 0, items: [] };
  }

  const lines = content.split("\n");
  let section = "";
  const items: TaskItem[] = [];

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      const s = sectionMatch[1].toLowerCase();
      if (s.includes("planned") || s.includes("todo")) section = "planned";
      else if (s.includes("in progress")) section = "inProgress";
      else if (s.includes("approved")) section = "approved";
      else if (s.includes("done")) section = "done";
      else if (s.includes("blocked")) section = "blocked";
      else section = "";
      continue;
    }

    const taskMatch = line.match(/^- \[([ x])\]\s+(.+)/);
    if (taskMatch && section) {
      const done = taskMatch[1] === "x";
      const text = taskMatch[2].trim();
      // Only match [waiting:X] as a standalone tag (at end of line or surrounded by whitespace)
      // Avoid false positives from descriptive text mentioning waiting tags
      const waitingMatch = text.match(/\[waiting:(\w+)\]\s*$/);
      items.push({
        text: text.replace(/\s*\[waiting:\w+\]\s*$/g, "").trim(),
        section,
        done,
        waiting: waitingMatch ? waitingMatch[1] : null,
      });
    }
  }

  const planned = items.filter((i) => i.section === "planned").length;
  const approved = items.filter((i) => i.section === "approved").length;
  const inProgress = items.filter((i) => i.section === "inProgress").length;
  const done = items.filter((i) => i.section === "done").length;
  const blocked = items.filter((i) => i.section === "blocked").length;
  const todo = planned; // backwards compat

  const activeTotal = planned + approved + inProgress + blocked;
  return { todo, inProgress, done, blocked, approved, planned, total: planned + approved + inProgress + done + blocked, activeTotal, items };
}

export async function parseProjectMd(filePath: string): Promise<{ name: string; description: string; status: string }> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return { name: "Unknown", description: "", status: "unknown" };
  }

  const nameMatch = content.match(/^#\s+(?:Project:\s+)?(.+)/m);
  const descMatch = content.match(/##\s+Overview\s*\n+(.+)/m);
  const statusMatch = content.match(/Status:\s*(\w+)/i);

  return {
    name: nameMatch ? nameMatch[1].trim() : "Unknown",
    description: descMatch ? descMatch[1].trim() : "",
    status: statusMatch ? statusMatch[1].toLowerCase() : "active",
  };
}
