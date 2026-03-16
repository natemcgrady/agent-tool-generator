export interface GeneratorConfig {
  input: string;
  output: string;
  name: string;
  stripPrefix?: string;
  authType?: "apiKey" | "bearer" | "basic";
  authHeader?: string;
  authPrefix?: string;
  authIn?: "header" | "query";
}

export const defaultConfig: Partial<GeneratorConfig> = {
  authType: "apiKey",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  authIn: "header",
};
