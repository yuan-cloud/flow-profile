# External Repo Safety

This project is a standalone, local prototype. It does not require any access to, or modification of, Node-RED or FlowFuse source code repositories.

## What this project does

- Reads a Node-RED flow export file (commonly `flows.json`) that you already have locally.
- Produces a deterministic output bundle (JSON and Markdown) that is safer to share with an AI assistant or a human support engineer.
- Optionally calls an LLM provider if you explicitly enable that feature. The AI feature is designed to be removable without breaking the product.

## What this project does not do

- Does not clone, fork, commit to, push to, or open PRs against Node-RED or FlowFuse repos.
- Does not call FlowFuse Cloud APIs.
- Does not call Node-RED Admin APIs.
- Does not execute flows, deploy flows, or modify a running Node-RED instance.
- Does not write into any existing FlowFuse or Node-RED working directory.

## What could accidentally "involve" them, and how to avoid it

### 1. Git remotes and forks
This repo should have one remote. Your repo.

Safety checklist:
- `git remote -v` should only show your own GitHub repo.
- Do not add a remote named `upstream` pointing at flowfuse or node-red.
- Do not run commands like `gh repo fork` targeting their orgs.

### 2. GitHub notifications and mentions
If you mention GitHub usernames or open PRs on their repos, that can notify people.

Avoid:
- `@flowfuse` or tagging FlowFuse employees by handle in commit messages.
- Opening issues or PRs on their repos as part of this prototype.

### 3. Copying internal or non-public material
Only use public information and your own work.

Avoid:
- Copying code from private repositories.
- Copying internal docs, internal screenshots, or non-public roadmap details.

### 4. Data leakage to AI providers
This repo is local-first, but if you enable optional AI, you may send text to a model provider.

Safety checklist before enabling AI:
- Confirm redaction is ON.
- Review the exact prompt context preview.
- Prefer using fixtures or synthetic flows for demos.
- Treat exported bundles as shareable artifacts. If you would not email it to a coworker, do not send it to an LLM.
- Browser note: direct calls to hosted AI APIs can be blocked by CORS. Use a trusted proxy/backend if needed.
