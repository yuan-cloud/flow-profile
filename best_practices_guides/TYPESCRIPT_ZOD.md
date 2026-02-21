# TYPESCRIPT_ZOD.md

## TypeScript strict mode
- Enable strict in tsconfig.
- Prefer explicit types at public boundaries.
- Do not use any where avoidable. Use unknown and narrow.

## Zod usage
- Validate every external input. flows.json, CLI flags, config files.
- Keep Zod schemas close to parsing code.
- Use passthrough to preserve unknown Node-RED fields.

## Browser compatibility
packages/core must not import:
- fs, path, process, node:*

Prefer pure functions and data-only transforms.
