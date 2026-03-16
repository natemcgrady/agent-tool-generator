import type { GeneratorConfig } from "../config.js";

export interface AuthInfo {
  optionsFields: string;
  headerCode: string;
  queryCode: string;
}

/**
 * Generate auth-related code fragments based on config.
 */
export function generateAuth(config: GeneratorConfig): AuthInfo {
  const authType = config.authType || "apiKey";
  const authHeader = config.authHeader || "Authorization";
  const authPrefix = config.authPrefix ?? "Bearer ";
  const authIn = config.authIn || "header";

  switch (authType) {
    case "apiKey": {
      if (authIn === "query") {
        return {
          optionsFields: "  apiToken: string;",
          headerCode: "",
          queryCode: `    url += (url.includes("?") ? "&" : "?") + "${authHeader}=" + encodeURIComponent(options.apiToken);`,
        };
      }
      return {
        optionsFields: "  apiToken: string;",
        headerCode: `          "${authHeader}": \`${escapeTemplate(authPrefix)}\${options.apiToken}\`,`,
        queryCode: "",
      };
    }
    case "bearer":
      return {
        optionsFields: "  bearerToken: string;",
        headerCode: `          "Authorization": \`Bearer \${options.bearerToken}\`,`,
        queryCode: "",
      };
    case "basic":
      return {
        optionsFields: "  username: string;\n  password: string;",
        headerCode: `          "Authorization": \`Basic \${btoa(options.username + ":" + options.password)}\`,`,
        queryCode: "",
      };
    default:
      return { optionsFields: "", headerCode: "", queryCode: "" };
  }
}

function escapeTemplate(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
