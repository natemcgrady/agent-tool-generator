export interface GeneratorConfig {
  input: string;
  output: string;
  name: string;
  endpoint?: string;
  stripPrefix?: string;
  emitJsdoc?: boolean;
  format?: "ai-sdk" | "eve";
  authType?: "apiKey" | "bearer" | "basic";
  authHeader?: string;
  authPrefix?: string;
  authIn?: "header" | "query";
}

export const defaultConfig: Partial<GeneratorConfig> = {
  emitJsdoc: false,
  format: "ai-sdk",
  authType: "apiKey",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  authIn: "header",
};
