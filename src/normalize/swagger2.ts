import type {
  NormalizedSpec,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedSchema,
  NormalizedSecurityDef,
} from "./types.js";
import { resolveRef } from "../util/refs.js";
import { convertSchema } from "./schema.js";

interface Swagger2Spec {
  swagger: string;
  info: { title: string; version: string; description?: string };
  basePath?: string;
  paths: Record<string, Record<string, Swagger2Operation>>;
  definitions?: Record<string, unknown>;
  securityDefinitions?: Record<string, Swagger2SecurityDef>;
}

interface Swagger2Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Swagger2Param[];
  responses?: Record<string, Swagger2Response>;
  deprecated?: boolean;
}

interface Swagger2Response {
  description?: string;
  schema?: Record<string, unknown>;
}

interface Swagger2Param {
  in: string;
  name: string;
  type?: string;
  format?: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  items?: Record<string, unknown>;
  schema?: Record<string, unknown>;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

interface Swagger2SecurityDef {
  type: string;
  name?: string;
  in?: string;
  description?: string;
}

const REF_PREFIX = "#/definitions/";
const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"];

export function normalizeSwagger2(raw: Record<string, unknown>): NormalizedSpec {
  const spec = raw as unknown as Swagger2Spec;
  const definitions = (spec.definitions || {}) as Record<string, unknown>;

  const operations: NormalizedOperation[] = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, endpoint] of Object.entries(methods)) {
      if (!HTTP_METHODS.includes(method)) continue;
      const op = endpoint as Swagger2Operation;

      const parameters: NormalizedParameter[] = [];
      let requestBody: NormalizedRequestBody | undefined;

      for (const param of op.parameters || []) {
        if (param.in === "body") {
          requestBody = {
            required: param.required ?? false,
            schema: convertSchema(param.schema || {}, definitions, REF_PREFIX),
            description: param.description,
          };
        } else if (param.in === "formData") {
          continue;
        } else {
          parameters.push({
            name: param.name,
            in: param.in as "query" | "path" | "header",
            required: param.required ?? false,
            schema: convertParamSchema(param, definitions),
            description: param.description,
          });
        }
      }

      let responseSchema: NormalizedSchema | undefined;
      if (op.responses) {
        const successResponse = op.responses["200"] || op.responses["201"];
        if (successResponse?.schema) {
          responseSchema = convertSchema(successResponse.schema, definitions, REF_PREFIX);
        }
      }

      operations.push({
        operationId: op.operationId,
        method,
        path,
        summary: op.summary,
        description: op.description,
        tags: op.tags || ["default"],
        parameters,
        requestBody,
        responseSchema,
        deprecated: op.deprecated,
      });
    }
  }

  const securityDefinitions: Record<string, NormalizedSecurityDef> = {};
  for (const [name, def] of Object.entries(spec.securityDefinitions || {})) {
    if (def.type === "apiKey") {
      securityDefinitions[name] = {
        type: "apiKey",
        name: def.name,
        in: def.in as "header" | "query",
      };
    } else if (def.type === "basic") {
      securityDefinitions[name] = { type: "http", scheme: "basic" };
    } else if (def.type === "oauth2") {
      securityDefinitions[name] = { type: "oauth2" };
    }
  }

  return {
    title: spec.info.title,
    version: spec.info.version,
    description: spec.info.description,
    basePath: spec.basePath || "",
    operations,
    securityDefinitions,
  };
}

function convertParamSchema(
  param: Swagger2Param,
  definitions: Record<string, unknown>,
): NormalizedSchema {
  if (param.enum && param.enum.length > 0) {
    return { type: "string", enum: param.enum, description: param.description };
  }
  switch (param.type) {
    case "string":
      return { type: "string", format: param.format, description: param.description };
    case "integer":
      return {
        type: "integer",
        format: param.format,
        minimum: param.minimum,
        maximum: param.maximum,
        description: param.description,
      };
    case "number":
      return {
        type: "number",
        format: param.format,
        minimum: param.minimum,
        maximum: param.maximum,
        description: param.description,
      };
    case "boolean":
      return { type: "boolean", description: param.description };
    case "array":
      return {
        type: "array",
        items: convertItemsSchema(param.items || {}, definitions),
        minItems: param.minItems,
        maxItems: param.maxItems,
        description: param.description,
      };
    default:
      return { type: param.type, description: param.description };
  }
}

function convertItemsSchema(
  items: Record<string, unknown>,
  definitions: Record<string, unknown>,
): NormalizedSchema {
  if (items.$ref) {
    return convertSchema(
      resolveRef(items.$ref as string, definitions) as Record<string, unknown> || {},
      definitions,
      REF_PREFIX,
    );
  }
  if (items.enum) {
    return { type: "string", enum: items.enum as unknown[] };
  }
  return { type: (items.type as string) || "string" };
}
