# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email your findings to: **security@flow-profile.dev** (or the repository owner)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability within 7 days
- **Resolution**: Critical issues will be prioritized for immediate patching
- **Disclosure**: We follow responsible disclosure practices

### Scope

This security policy applies to:

- `@flow-profile/core` - Core parsing and analysis library
- `@flow-profile/cli` - Command-line interface
- `@flow-profile/ui` - UI component library
- `@flow-profile/ai` - AI integration adapters
- `apps/web` - Web application

### Out of Scope

- Vulnerabilities in third-party dependencies (report to upstream)
- Issues that require physical access to the user's machine
- Social engineering attacks

## Security Best Practices

When using Flow Profile:

1. **Never commit secrets**: Flow Profile detects high-entropy strings that may be secrets. Remove them before sharing flows.
2. **Review AI context**: The generated context may include sensitive flow configuration. Review before sharing with AI assistants.
3. **Keep dependencies updated**: Run `bun update` regularly to get security patches.

## Recognition

We appreciate security researchers who help keep Flow Profile safe. With your permission, we will acknowledge your contribution in our release notes.
