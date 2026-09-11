import * as fs from "node:fs";
import * as path from "node:path";
import type { NormalizedSpec, NormalizedOperation } from "../normalize/types.js";
import type { GeneratorConfig } from "../config.js";
import { generateAuth, type AuthInfo } from "./auth.js";
import { emitTool } from "./tool-emitter.js";
import { emitEveTool } from "./eve-tool-emitter.js";
import { deriveToolName, deduplicateName, camelToKebab, camelToSnake, tagToFilename } from "../util/naming.js";

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
  const endpointFilter = config.endpoint?.trim().toLowerCase();
  const operations = endpointFilter
    ? spec.operations.filter((op) => op.path.toLowerCase().includes(endpointFilter))
    : spec.operations;

  if (endpointFilter) {
    console.log(
      `Applying endpoint filter "${config.endpoint}": ${operations.length}/${spec.operations.length} operations matched`,
    );
  }

  const isEve = config.format === "eve";

  // Group operations by first tag
  const groups = new Map<string, NormalizedOperation[]>();
  for (const op of operations) {
    const tag = op.tags[0] || "default";
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag)!.push(op);
  }

  // Ensure output directory exists
  fs.mkdirSync(config.output, { recursive: true });

  // Emit shared types file at root (not needed for eve format)
  if (!isEve) {
    const typesContent = [
      `export type ${optionsTypeName} = {`,
      `  baseUrl: string;`,
      ...(auth.optionsFields ? [auth.optionsFields] : []),
      `};`,
      "",
    ].join("\n");
    fs.writeFileSync(path.join(config.output, "_types.ts"), typesContent, "utf-8");
  }

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

      const filename = (isEve ? camelToSnake(toolName) : camelToKebab(toolName)) + ".ts";
      const content = emitSingleToolFile(op, config, auth, toolName, optionsTypeName, isEve);
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
  if (tagDirs.length > 0) {
    if (isEve) {
      console.log(
        `Place these tool files in your eve agent's agent/tools/ directory to use them.`,
      );
    } else {
      console.log(
        `Import tools directly: import { toolName } from "./${tagDirs[0].dirName}/tool-file.js"`,
      );
    }
  } else {
    console.log(`No tool files were generated for the selected operations.`);
  }
}

function emitSingleToolFile(
  op: NormalizedOperation,
  config: GeneratorConfig,
  auth: AuthInfo,
  toolName: string,
  optionsTypeName: string,
  isEve: boolean,
): string {
  const lines: string[] = [];

  if (isEve) {
    lines.push(`import { defineTool } from "eve/tools";`);
    lines.push(`import { z } from "zod";`);
    lines.push(``);
    lines.push(`// Configure your API options`);
    lines.push(`const options = {`);
    lines.push(`  baseUrl: process.env.API_BASE_URL || "",`);
    if (auth.optionsFields) {
      // Extract auth field from optionsFields
      const authMatch = auth.optionsFields.match(/(\w+):/);
      if (authMatch) {
        const authField = authMatch[1];
        lines.push(`  ${authField}: process.env.API_TOKEN || "",`);
      }
    }
    lines.push(`};`);
    lines.push(``);

    const freshSeen = new Set<string>();
    const code = emitEveTool(op, config, auth, optionsTypeName, freshSeen);
    lines.push(code);
  } else {
    lines.push(`import { tool } from "ai";`);
    lines.push(`import { z } from "zod";`);
    lines.push(`import type { ${optionsTypeName} } from "../_types.js";`);
    lines.push("");

    const freshSeen = new Set<string>();
    const code = emitTool(op, config, auth, optionsTypeName, freshSeen);
    lines.push(code);
  }

  lines.push("");
  return lines.join("\n");
}
