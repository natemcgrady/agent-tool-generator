import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { GeneratorConfig } from "./config.js";
import { normalize } from "./normalize/index.js";
import { generate } from "./codegen/index.js";

export type { GeneratorConfig } from "./config.js";

/**
 * Generate AI SDK tools from an OpenAPI spec.
 */
export async function generateTools(config: GeneratorConfig): Promise<void> {
  const raw = await readOpenApiSource(config.input);
  const spec = parseOpenApiSpec(raw, config.input);
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

function parseOpenApiSpec(raw: string, input: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (jsonError) {
    try {
      const parsed = parseYaml(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Parsed YAML spec is not an object");
      }

      return parsed as Record<string, unknown>;
    } catch (yamlError) {
      const jsonMessage =
        jsonError instanceof Error ? jsonError.message : String(jsonError);
      const yamlMessage =
        yamlError instanceof Error ? yamlError.message : String(yamlError);
      throw new Error(
        `Failed to parse OpenAPI spec from "${input}". Expected valid JSON or YAML.\nJSON parse error: ${jsonMessage}\nYAML parse error: ${yamlMessage}`,
      );
    }
  }
}
