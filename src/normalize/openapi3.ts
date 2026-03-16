import type {
  NormalizedSpec,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedSchema,
  NormalizedSecurityDef,
} from "./types.js";
import { convertSchema } from "./schema.js";

interface OpenAPI3Spec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string }[];
  paths: Record<string, Record<string, OpenAPI3Operation>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, OpenAPI3SecurityScheme>;
  };
}

interface OpenAPI3Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPI3Param[];
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses?: Record<string, {
    description?: string;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  }>;
  deprecated?: boolean;
}

interface OpenAPI3Param {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

interface OpenAPI3SecurityScheme {
  type: string;
  name?: string;
  in?: string;
  scheme?: string;
}

const REF_PREFIX = "#/components/schemas/";
const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"];

export function normalizeOpenAPI3(raw: Record<string, unknown>): NormalizedSpec {
  const spec = raw as unknown as OpenAPI3Spec;
  const schemas = spec.components?.schemas || {};

  const operations: NormalizedOperation[] = [];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, endpoint] of Object.entries(methods)) {
      if (!HTTP_METHODS.includes(method)) continue;
      const op = endpoint as OpenAPI3Operation;

      const parameters: NormalizedParameter[] = [];
      for (const param of op.parameters || []) {
        parameters.push({
          name: param.name,
          in: param.in as "query" | "path" | "header" | "cookie",
          required: param.required ?? false,
          schema: convertSchema(param.schema || {}, schemas, REF_PREFIX),
          description: param.description,
        });
      }

      let requestBody: NormalizedRequestBody | undefined;
      if (op.requestBody?.content) {
        const jsonContent =
          op.requestBody.content["application/json"] ||
          Object.values(op.requestBody.content)[0];
        if (jsonContent?.schema) {
          requestBody = {
            required: op.requestBody.required ?? false,
            schema: convertSchema(jsonContent.schema, schemas, REF_PREFIX),
            description: op.requestBody.description,
          };
        }
      }

      let responseSchema: NormalizedSchema | undefined;
      if (op.responses) {
        const successResponse = op.responses["200"] || op.responses["201"];
        if (successResponse?.content) {
          const jsonContent =
            successResponse.content["application/json"] ||
            Object.values(successResponse.content)[0];
          if (jsonContent?.schema) {
            responseSchema = convertSchema(jsonContent.schema, schemas, REF_PREFIX);
          }
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
  for (const [name, scheme] of Object.entries(spec.components?.securitySchemes || {})) {
    if (scheme.type === "apiKey") {
      securityDefinitions[name] = {
        type: "apiKey",
        name: scheme.name,
        in: scheme.in as "header" | "query",
      };
    } else if (scheme.type === "http") {
      securityDefinitions[name] = {
        type: "http",
        scheme: scheme.scheme,
      };
    } else if (scheme.type === "oauth2") {
      securityDefinitions[name] = { type: "oauth2" };
    }
  }

  let basePath = "";
  if (spec.servers?.[0]?.url) {
    try {
      const url = new URL(spec.servers[0].url);
      basePath = url.pathname.replace(/\/$/, "");
    } catch {
      basePath = spec.servers[0].url.replace(/\/$/, "");
    }
  }

  return {
    title: spec.info.title,
    version: spec.info.version,
    description: spec.info.description,
    basePath,
    operations,
    securityDefinitions,
  };
}
