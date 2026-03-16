# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.0.4] - 2026-03-16

### Changed
- CLI `--input` now accepts either a local JSON file path or an `http(s)` URL to a remote OpenAPI/Swagger JSON spec.

## [0.0.3] - 2026-03-16

### Changed
- Code generation now normalizes operation input parameter names to safe camelCase identifiers and emits dot-notation access (for example, `params.pamName` instead of `params["pam-name"]`).
- README corrected to match actual generator output and usage:
  - removed barrel export claims (`index.ts` files are not generated)
  - updated examples to use direct per-tool imports
  - updated auth option examples to use `apiToken`

## [0.0.2] - 2026-03-16

### Added
- Published CLI support via package `bin` entry (`agent-tool-generator` -> `dist/cli.js`).
- Node shebang in the CLI entrypoint so installed executions run directly.
- `CHANGELOG.md` for release tracking.

### Changed
- Build now emits both library and CLI outputs (`src/index.ts` and `src/cli.ts`).
- README install and usage examples now cover installed CLI usage with `pnpm dlx` and `pnpm exec`.
- CLI help usage text now reflects the real command name: `agent-tool-generator [options]`.
