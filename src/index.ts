import { readFile } from "node:fs/promises";
import type { GeneratorConfig } from "./config.js";
import { normalize } from "./normalize/index.js";
import { generate } from "./codegen/index.js";

export type { GeneratorConfig } from "./config.js";

/**
 * Generate AI SDK tools from an OpenAPI spec.
 */
export async function generateTools(config: GeneratorConfig): Promise<void> {
  const raw = await readOpenApiSource(config.input);
  const spec = JSON.parse(raw) as Record<string, unknown>;
  const normalized = normalize(spec);

  console.log(
    `Loaded ${normalized.operations.length} operations from "${normalized.title}" (v${normalized.version})`,
  );

  generate(normalized, config);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function readOpenApiSource(input: string): Promise<string> {
  if (!isHttpUrl(input)) {
    return readFile(input, "utf-8");
  }

  const response = await fetch(input);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI spec from URL "${input}" (${response.status} ${response.statusText})`,
    );
  }

  return response.text();
}
