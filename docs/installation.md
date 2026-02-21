# Installation

Flow Profile is a local-only prototype. There is no published package at the time of writing, so install from source.

## Prerequisites

- Bun >= 1.1.0
- Node.js >= 20

## From source (recommended)

```bash
git clone <repo>
cd flow-profile
bun install
```

### Build the CLI

```bash
bun run --cwd packages/cli build
```

### Run the CLI from source

```bash
node packages/cli/dist/cli.js --help
node packages/cli/dist/cli.js build --in ./flows.json --out-dir ./out
```

### Run the web app

```bash
bun run dev
```

Open http://localhost:5173 and drag drop a Node-RED export (`flows.json`).

## Verify installation

- CLI: `node packages/cli/dist/cli.js --help`
- Web: load the app and drop a `flows.json` file to see the parsed UI.
