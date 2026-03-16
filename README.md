# agent-tool-generator

A CLI tool that generates type-safe [AI SDK](https://sdk.vercel.ai/) tools from OpenAPI 3.x and Swagger 2.0 specifications. Point it at a spec and get one tool per operation, complete with Zod schemas, auth handling, and barrel exports — ready to plug into any AI SDK agent.

## Installation

```bash
pnpm install
```

## Quick Start

```bash
pnpm generate -- \
  -i ./swagger.json \
  -o ./src/tools/my-api \
  -n MyApi
```

This reads `swagger.json`, detects whether it's Swagger 2.0 or OpenAPI 3.x, and writes generated tools to `src/tools/my-api/`.

## CLI Options

| Flag | Short | Description | Default |
| --- | --- | --- | --- |
| `--input <path>` | `-i` | Path to OpenAPI/Swagger spec (JSON) | **required** |
| `--output <dir>` | `-o` | Output directory for generated files | **required** |
| `--name <name>` | `-n` | API name used for type names (e.g. `SentinelOne`) | **required** |
| `--strip-prefix <prefix>` | | Path prefix to strip when deriving tool names | |
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
├── index.ts               # Root barrel export
├── accounts/
│   ├── get-accounts.ts    # One file per operation
│   ├── post-accounts.ts
│   └── index.ts           # Per-tag barrel export
├── agents/
│   ├── get-agents.ts
│   └── index.ts
└── ...
```

- **One file per operation** — each exports a tool factory function
- **Grouped by tag** — operations are organized into subdirectories by their first OpenAPI tag
- **Barrel exports** — every directory has an `index.ts` so you can import from the root

## Usage in Code

```ts
import { getAccounts, postAccounts } from "./tools/my-api";

const tools = {
  getAccounts: getAccounts({ baseUrl: "https://api.example.com", apiKey: API_KEY }),
  postAccounts: postAccounts({ baseUrl: "https://api.example.com", apiKey: API_KEY }),
};
```

Each generated tool is compatible with the AI SDK `tool()` interface and includes:

- A Zod input schema derived from the spec's path, query, and body parameters
- A description pulled from the operation's summary/description
- An `execute` function that makes the HTTP request with proper auth

## Supported Specs

- **Swagger 2.0** — auto-detected via `"swagger": "2.x"` or the presence of `definitions`
- **OpenAPI 3.x** — auto-detected via `"openapi": "3.x"`

Specs must be JSON. Convert YAML specs to JSON before running the generator.

## Peer Dependencies

- `ai` ^5.0.0
- `zod` ^4.0.0

## Scripts

| Script | Description |
| --- | --- |
| `pnpm generate` | Run the generator CLI |
| `pnpm build` | Build the package with tsup |
| `pnpm test` | Run the test file |

## License

ISC
