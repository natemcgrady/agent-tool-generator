import type { NormalizedSchema } from "./types.js";
import { resolveRef } from "../util/refs.js";

/**
 * Recursively convert a raw JSON Schema object into a NormalizedSchema.
 * Shared by both Swagger 2.0 and OpenAPI 3.0 normalizers.
 */
export function convertSchema(
  schema: Record<string, unknown>,
  definitions: Record<string, unknown>,
  refPrefix: string,
  visited = new Set<string>(),
): NormalizedSchema {
  if (schema.$ref) {
    const ref = schema.$ref as string;
    const name = ref.startsWith(refPrefix) ? ref.slice(refPrefix.length) : ref;
    if (visited.has(name)) return {};
    visited.add(name);
    const resolved = resolveRef(ref, definitions, refPrefix) as Record<string, unknown>;
    if (!resolved) return {};
    return convertSchema(resolved, definitions, refPrefix, visited);
  }

  const result: NormalizedSchema = {};
  if (schema.type) result.type = schema.type as string;
  if (schema.format) result.format = schema.format as string;
  if (schema.description) {
    result.description = Array.isArray(schema.description)
      ? (schema.description as unknown[]).join("\n")
      : (schema.description as string);
  }
  if (schema.enum) result.enum = schema.enum as unknown[];
  if (schema.minimum !== undefined) result.minimum = schema.minimum as number;
  if (schema.maximum !== undefined) result.maximum = schema.maximum as number;
  if (schema.minItems !== undefined) result.minItems = schema.minItems as number;
  if (schema.maxItems !== undefined) result.maxItems = schema.maxItems as number;
  if (schema.nullable || schema["x-nullable"]) result.nullable = true;

  if (schema.items) {
    result.items = convertSchema(
      schema.items as Record<string, unknown>,
      definitions,
      refPrefix,
      new Set(visited),
    );
  }

  if (schema.properties) {
    result.properties = {};
    const props = schema.properties as Record<string, Record<string, unknown>>;
    for (const [key, val] of Object.entries(props)) {
      result.properties[key] = convertSchema(val, definitions, refPrefix, new Set(visited));
    }
    if (schema.required) result.required = schema.required as string[];
  }

  if (result.properties && !result.type) {
    result.type = "object";
  }

  return result;
}
