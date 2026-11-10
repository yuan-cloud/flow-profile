# Installation

Flow Profile is a prototype installed from source. Flow processing runs locally; the web app loads external fonts and offers optional AI provider connections.

## Prerequisites

- Bun 1.3.14 (pinned in CI and `packageManager`; older Bun 1.1 does not use this repository's text lockfile)
- Node.js >= 20

## From source (recommended)

```bash
git clone https://github.com/yuan-cloud/flow-profile.git
cd flow-profile
bun install --frozen-lockfile
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

Redaction and strict mode default to enabled. Review the Redaction Report, prompt preview and downloaded JSON before sharing. See [web privacy limitations](web.md#privacy-and-current-limitations).

## Verify installation

- CLI: `node packages/cli/dist/cli.js --help`
- Web: load the app and drop a `flows.json` file to see the parsed UI.
