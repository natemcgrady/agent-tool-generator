# agent-tool-generator

A CLI tool that generates type-safe [AI SDK](https://sdk.vercel.ai/) tools from OpenAPI 3.x and Swagger 2.0 specifications. Point it at a spec and get one tool per operation, complete with Zod schemas and auth handling — ready to plug into any AI SDK agent.

## Installation

```bash
pnpm add agent-tool-generator
```

## Quick Start

```bash
pnpm dlx agent-tool-generator \
  -i ./swagger.json \
  -o ./src/tools/my-api \
  -n MyApi
```

This reads `swagger.json`, detects whether it's Swagger 2.0 or OpenAPI 3.x, and writes generated tools to `src/tools/my-api/`.

If the package is installed in your project, you can also run:

```bash
pnpm exec agent-tool-generator \
  -i ./swagger.json \
  -o ./src/tools/my-api \
  -n MyApi
```

## CLI Options

| Flag | Short | Description | Default |
| --- | --- | --- | --- |
| `--input <source>` | `-i` | OpenAPI/Swagger spec source: local path or http(s) URL (JSON/YAML) | **required** |
| `--output <dir>` | `-o` | Output directory for generated files | **required** |
| `--name <name>` | `-n` | API name used for type names (e.g. `SentinelOne`) | **required** |
| `--strip-prefix <prefix>` | | Path prefix to strip when deriving tool names | |
| `--emit-jsdoc` | | Emit JSDoc comments in generated tool files with required input/output details | `false` |
| `--auth-type <type>` | | Auth type: `apiKey`, `bearer`, `basic` | `apiKey` |
| `--auth-header <name>` | | Auth header name | `Authorization` |
| `--auth-prefix <prefix>` | | Auth value prefix | `Bearer ` |
| `--auth-in <location>` | | Auth location: `header`, `query` | `header` |
| `--help` | `-h` | Show help | |

## Generated Output

Given a spec, the generator produces:

```
src/tools/my-api/
├── _types.ts              # Shared options type (baseUrl, auth)
├── accounts/
│   ├── get-accounts.ts    # One file per operation
│   └── post-accounts.ts
├── agents/
│   └── get-agents.ts
└── ...
```

- **One file per operation** — each exports a tool factory function
- **Grouped by tag** — operations are organized into subdirectories by their first OpenAPI tag
- **Direct file imports** — barrel `index.ts` files are not generated

## Usage in Code

```ts
import { getAccounts } from "./tools/my-api/accounts/get-accounts.js";
import { postAccounts } from "./tools/my-api/accounts/post-accounts.js";

const tools = {
  getAccounts: getAccounts({ baseUrl: "https://api.example.com", apiToken: API_TOKEN }),
  postAccounts: postAccounts({ baseUrl: "https://api.example.com", apiToken: API_TOKEN }),
};
```

Each generated tool is compatible with the AI SDK `tool()` interface and includes:

- A Zod input schema derived from the spec's path, query, and body parameters
- A description pulled from the operation's summary/description
- An `execute` function that makes the HTTP request with proper auth
- Optional JSDoc blocks (`--emit-jsdoc`) that document required input and output contracts

## Supported Specs

- **Swagger 2.0** — auto-detected via `"swagger": "2.x"` or the presence of `definitions`
- **OpenAPI 3.x** — auto-detected via `"openapi": "3.x"`

Specs can be JSON or YAML, from a local file or a remote `http://` / `https://` URL.

## Peer Dependencies

- `ai` ^5.0.0
- `zod` ^4.0.0

## Scripts

| Script | Description |
| --- | --- |
| `pnpm generate` | Run the local TypeScript CLI (repo development) |
| `pnpm build` | Build the package with tsup |
| `pnpm test` | Run the package's configured test command |

## License

ISC
