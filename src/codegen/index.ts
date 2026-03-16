import * as fs from "node:fs";
import * as path from "node:path";
import type { NormalizedSpec, NormalizedOperation } from "../normalize/types.js";
import type { GeneratorConfig } from "../config.js";
import { generateAuth, type AuthInfo } from "./auth.js";
import { emitTool } from "./tool-emitter.js";
import { deriveToolName, deduplicateName, camelToKebab, tagToFilename } from "../util/naming.js";

interface ToolEntry {
  toolName: string;
  filename: string;
}

/**
 * Emit one file per operation, grouped into tag subdirectories.
 */
export function generate(spec: NormalizedSpec, config: GeneratorConfig): void {
  const auth = generateAuth(config);
  const optionsTypeName = `${config.name}Options`;

  // Group operations by first tag
  const groups = new Map<string, NormalizedOperation[]>();
  for (const op of spec.operations) {
    const tag = op.tags[0] || "default";
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag)!.push(op);
  }

  // Ensure output directory exists
  fs.mkdirSync(config.output, { recursive: true });

  // Emit shared types file at root
  const typesContent = [
    `export type ${optionsTypeName} = {`,
    `  baseUrl: string;`,
    ...(auth.optionsFields ? [auth.optionsFields] : []),
    `};`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(config.output, "_types.ts"), typesContent, "utf-8");

  let totalTools = 0;
  const tagDirs: { tag: string; dirName: string; tools: ToolEntry[] }[] = [];

  for (const [tag, operations] of groups) {
    const dirName = tagToFilename(tag);
    const tagDir = path.join(config.output, dirName);
    fs.mkdirSync(tagDir, { recursive: true });

    // Deduplicate tool names within this tag
    const seenNames = new Set<string>();
    const tools: ToolEntry[] = [];

    for (const op of operations) {
      const toolName = deduplicateName(
        deriveToolName(op.method, op.path, config.stripPrefix),
        seenNames,
      );

      const filename = camelToKebab(toolName) + ".ts";
      const content = emitSingleToolFile(op, config, auth, toolName, optionsTypeName);
      fs.writeFileSync(path.join(tagDir, filename), content, "utf-8");

      tools.push({ toolName, filename });
      totalTools++;
    }

    tagDirs.push({ tag, dirName, tools });
    console.log(`  ${dirName}/ (${tools.length} tools)`);
  }

  console.log(
    `\nGenerated ${totalTools} tools in ${tagDirs.length} directories in ${config.output}`,
  );
  console.log(
    `Import tools directly: import { toolName } from "./${tagDirs[0]?.dirName}/tool-file.js"`,
  );
}

function emitSingleToolFile(
  op: NormalizedOperation,
  config: GeneratorConfig,
  auth: AuthInfo,
  toolName: string,
  optionsTypeName: string,
): string {
  const lines: string[] = [];

  lines.push(`import { tool } from "ai";`);
  lines.push(`import { z } from "zod";`);
  lines.push(`import type { ${optionsTypeName} } from "../_types.js";`);
  lines.push("");

  const freshSeen = new Set<string>();
  const code = emitTool(op, config, auth, optionsTypeName, freshSeen);
  lines.push(code);
  lines.push("");

  return lines.join("\n");
}
