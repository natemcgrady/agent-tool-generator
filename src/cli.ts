#!/usr/bin/env node

import { parseArgs } from "node:util";
import { generateTools } from "./index.js";
import type { GeneratorConfig } from "./config.js";

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    name: { type: "string", short: "n" },
    "strip-prefix": { type: "string" },
    "auth-type": { type: "string" },
    "auth-header": { type: "string" },
    "auth-prefix": { type: "string" },
    "auth-in": { type: "string" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help || !values.input || !values.output || !values.name) {
  console.log(`Usage: agent-tool-generator [options]

Options:
  -i, --input <source>      OpenAPI/Swagger spec source: local path or http(s) URL (JSON/YAML)
  -o, --output <dir>        Output directory for generated files
  -n, --name <name>         API name (used for type names, e.g. "SentinelOne")
  --strip-prefix <prefix>   Path prefix to strip when deriving tool names
  --auth-type <type>        Auth type: apiKey, bearer, basic (default: apiKey)
  --auth-header <name>      Auth header name (default: Authorization)
  --auth-prefix <prefix>    Auth value prefix (default: "Bearer ")
  --auth-in <location>      Auth location: header, query (default: header)
  -h, --help                Show this help
`);
  process.exit(values.help ? 0 : 1);
}

const config: GeneratorConfig = {
  input: values.input,
  output: values.output,
  name: values.name,
  stripPrefix: values["strip-prefix"],
  authType: values["auth-type"] as GeneratorConfig["authType"],
  authHeader: values["auth-header"],
  authPrefix: values["auth-prefix"],
  authIn: values["auth-in"] as GeneratorConfig["authIn"],
};

void generateTools(config).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
