import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { IDEAS_DIR } from "../services/paths.js";

export const ideasRouter = Router();

interface Idea {
  id: string;
  name: string;
  status: string;
  description: string;
  tags: string[];
  added: string;
  meta: string;
}

ideasRouter.get("/", async (_req, res) => {
  try {
    // Parse IDEAS.md index for ordered list with metadata
    const ideasMd = await fs.readFile(path.join(IDEAS_DIR, "IDEAS.md"), "utf-8").catch(() => "");
    const ideas: Idea[] = [];

    const ideaBlocks = ideasMd.split(/\n##\s+/).slice(1); // skip header
    for (const block of ideaBlocks) {
      const lines = block.trim().split("\n");
      const nameMatch = lines[0]?.match(/^[^\w]*(.+)/);
      if (!nameMatch) continue;

      const name = nameMatch[1].trim();
      const statusMatch = block.match(/\*\*Status:\*\*\s*(\S+)/);
      // Skip blocks without a Status line (section headers like "Lifecycle")
      if (!statusMatch) continue;

      const tagsMatch = block.match(/\*\*Tags:\*\*\s*(.+)/);
      const addedMatch = block.match(/\*\*Added:\*\*\s*([\d-]+)/);
      const dirMatch = block.match(/📁\s*`ideas\/([^/]+)\//);

      const status = statusMatch[1].replace(/[→]/, "").trim();
      const description = lines.find((l, i) => i > 0 && l.trim() && !l.startsWith("**") && !l.startsWith("📁"))?.trim() || "";

      // Skip graduated projects
      if (status === "project" || status.includes("project")) continue;

      // Read individual README for extra meta
      let meta = "";
      if (dirMatch) {
        try {
          const readme = await fs.readFile(path.join(IDEAS_DIR, dirMatch[1], "README.md"), "utf-8");
          if (readme.includes("Full spec")) meta = "Full spec ready";
          else if (readme.includes("mockup") || readme.includes("Mockup")) meta = "Mockup ready";
          else if (readme.includes("Not started")) meta = "Not started";
          else meta = readme.includes("brewing") ? "Researching" : "Needs scoping";
        } catch { /* ok */ }
      }

      ideas.push({
        id: dirMatch?.[1] || name.toLowerCase().replace(/\s+/g, "-"),
        name,
        status,
        description,
        tags: tagsMatch ? tagsMatch[1].split(/\s+/).filter((t) => t.startsWith("#")) : [],
        added: addedMatch?.[1] || "",
        meta,
      });
    }

    res.json(ideas);
  } catch (err) {
    res.status(500).json({ error: "Failed to get ideas" });
  }
});
