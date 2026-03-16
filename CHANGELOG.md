# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - 2026-03-16

### Added
- Published CLI support via package `bin` entry (`agent-tool-generator` -> `dist/cli.js`).
- Node shebang in the CLI entrypoint so installed executions run directly.
- `CHANGELOG.md` for release tracking.

### Changed
- Build now emits both library and CLI outputs (`src/index.ts` and `src/cli.ts`).
- README install and usage examples now cover installed CLI usage with `pnpm dlx` and `pnpm exec`.
- CLI help usage text now reflects the real command name: `agent-tool-generator [options]`.
