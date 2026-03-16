export interface NormalizedSpec {
  title: string;
  version: string;
  description?: string;
  basePath: string;
  operations: NormalizedOperation[];
  securityDefinitions: Record<string, NormalizedSecurityDef>;
}

export interface NormalizedOperation {
  operationId?: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responseSchema?: NormalizedSchema;
  deprecated?: boolean;
}

export interface NormalizedParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  schema: NormalizedSchema;
  description?: string;
}

export interface NormalizedRequestBody {
  required: boolean;
  schema: NormalizedSchema;
  description?: string;
}

export interface NormalizedSchema {
  type?: string;
  format?: string;
  description?: string;
  enum?: unknown[];
  items?: NormalizedSchema;
  properties?: Record<string, NormalizedSchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  nullable?: boolean;
  $ref?: string;
}

export interface NormalizedSecurityDef {
  type: "apiKey" | "http" | "oauth2";
  name?: string;
  in?: "header" | "query";
  scheme?: string;
}
