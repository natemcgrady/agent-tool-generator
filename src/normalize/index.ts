import type { NormalizedSpec } from "./types.js";
import { normalizeSwagger2 } from "./swagger2.js";
import { normalizeOpenAPI3 } from "./openapi3.js";

type SpecVersion = "swagger2" | "openapi3";

function detectVersion(spec: Record<string, unknown>): SpecVersion {
  if (typeof spec.swagger === "string" && spec.swagger.startsWith("2")) {
    return "swagger2";
  }
  if (typeof spec.openapi === "string" && spec.openapi.startsWith("3")) {
    return "openapi3";
  }
  if (spec.definitions && spec.paths) {
    return "swagger2";
  }
  return "openapi3";
}

export function normalize(rawSpec: Record<string, unknown>): NormalizedSpec {
  const version = detectVersion(rawSpec);
  switch (version) {
    case "swagger2":
      return normalizeSwagger2(rawSpec);
    case "openapi3":
      return normalizeOpenAPI3(rawSpec);
  }
}

export type { NormalizedSpec } from "./types.js";
