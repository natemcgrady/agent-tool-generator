export interface GeneratorConfig {
  input: string;
  output: string;
  name: string;
  stripPrefix?: string;
  emitJsdoc?: boolean;
  authType?: "apiKey" | "bearer" | "basic";
  authHeader?: string;
  authPrefix?: string;
  authIn?: "header" | "query";
}

export const defaultConfig: Partial<GeneratorConfig> = {
  emitJsdoc: false,
  authType: "apiKey",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  authIn: "header",
};
