# Contributing to Flow Profile

Thank you for your interest in contributing to Flow Profile! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.1.0 or higher
- Node.js 20+ (for compatibility testing)
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yuan-cloud/flow-profile.git
cd flow-profile

# Install dependencies
bun install

# Run tests
bun run test

# Start development server (web app)
bun run dev
```

## Project Structure

```
flow-profile/
├── packages/
│   ├── core/     # Core parsing and analysis library
│   ├── cli/      # Command-line interface
│   ├── ui/       # Shared UI components
│   └── ai/       # AI provider adapters
├── apps/
│   └── web/      # Vue 3 web application
├── testdata/     # Test fixtures and factories
└── docs/         # Documentation
```

## Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Check linting
bun run lint

# Auto-fix issues
bun run lint:fix

# Format code
bun run format
```

### Guidelines

- Use TypeScript strict mode
- Prefer functional patterns over classes
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Avoid `any` types - use proper typing or `unknown`

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(core): add circular subflow detection

fix(web): resolve flaky E2E selectors

docs: add CONTRIBUTING guide
```

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `master`: `git checkout -b feat/my-feature`
3. **Make your changes** following the code style guidelines
4. **Write tests** for new functionality
5. **Run the test suite**: `bun run test`
6. **Commit** using conventional commits
7. **Push** to your fork
8. **Open a PR** against `master`

### PR Requirements

- [ ] Tests pass (`bun test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Build passes (`bun run build`)
- [ ] Changes are documented if needed
- [ ] PR description explains the changes

## Testing

### Unit Tests

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

### E2E Tests

```bash
# Run Playwright tests (requires dev server)
cd apps/web
bun run dev &
bun run test:e2e
```

### Test Guidelines

- Use the test factories in `testdata/factories/` for creating test data
- Prefer real implementations over mocks
- Test edge cases and error conditions
- Keep tests focused and readable

## API Documentation

We generate API docs with TypeDoc for each package.

```bash
# Generate API docs for all packages
bun run docs:api
```

Docs are written to `docs/api/` (generated output; do not commit).

## VPS / Headless Environments

Some VPS setups are sensitive to concurrent build/test runs (Vite/Vitest/esbuild service mode). To keep builds stable:

- Run **only one** build or test at a time.
- Prefer a real TTY session (avoid background or overlapping runs).
- If a build/test hangs, stop and capture the error and process list before retrying.
- If repeated hangs occur, run builds/tests locally or in CI.

Optional workaround for VPS stability:

```bash
GOMAXPROCS=1 bun run build
GOMAXPROCS=1 bun run test
```

For Playwright on headless VPS, use the project wrapper (`bun run test:e2e`). If Chromium sandboxing fails, run E2E tests and screenshots on a machine with full browser support.

## Architecture Decisions

Major architecture decisions are documented in the codebase. When proposing significant changes:

1. Open an issue first to discuss the approach
2. Consider backwards compatibility
3. Document the rationale in code comments or PR description

## Getting Help

- Open an [issue](https://github.com/yuan-cloud/flow-profile/issues) for bugs or feature requests
- Check existing issues before creating new ones
- Provide reproduction steps for bugs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
