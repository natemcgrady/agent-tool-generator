import * as fs from "node:fs";
import type { GeneratorConfig } from "./config.js";
import { normalize } from "./normalize/index.js";
import { generate } from "./codegen/index.js";

export type { GeneratorConfig } from "./config.js";

/**
 * Generate AI SDK tools from an OpenAPI spec.
 */
export function generateTools(config: GeneratorConfig): void {
  const raw = fs.readFileSync(config.input, "utf-8");
  const spec = JSON.parse(raw) as Record<string, unknown>;
  const normalized = normalize(spec);

  console.log(
    `Loaded ${normalized.operations.length} operations from "${normalized.title}" (v${normalized.version})`,
  );

  generate(normalized, config);
}
