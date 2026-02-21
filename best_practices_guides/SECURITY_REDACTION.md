# SECURITY_REDACTION.md

## Core Principle

Redaction exists to remove user fear of using AI with their flows. If users worry about leaking secrets, they won't use the tool. Make redaction invisible and automatic.

## Defaults (Non-Negotiable)

- Redaction ON by default
- Strict mode ON by default (includes entropy scanning)
- No secrets written to disk in ANY output
- Original values NEVER appear in outputs, logs, or error messages

## Detection Layer 1: Field-Name Patterns

Match field names case-insensitively:

```
password, passwd, pwd
token, apikey, api_key, apiToken
secret, secretkey, secret_key
credentials, credential
auth, authorization, auth_token
privatekey, private_key
accesskey, access_key
bearer, bearer_token
session, session_id, sessionid
```

## Detection Layer 2: Entropy Scanning (Strict Mode)

High-entropy strings are often secrets.

### Shannon Entropy Formula

```typescript
function calculateEntropy(str: string): number {
  const freq = new Map<string, number>();
  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
```

### Threshold

- Default: 4.5
- Adjustable by user
- Lower = more aggressive (more false positives)
- Higher = less aggressive (might miss secrets)

### Common False Positives

Skip entropy scanning for:
- UUIDs (pattern: 8-4-4-4-12 hex characters)
- Strings shorter than 8 characters
- Known safe formats (ISO dates, version strings)
- Base64-encoded short strings

## Deterministic Masking

### Algorithm

1. Collect all values that match detection criteria
2. Sort values alphabetically (for determinism)
3. Assign masks in order: SECRET_A1, SECRET_A2, ..., SECRET_B1, ...
4. Same value → same mask (allows pattern recognition)

### Example

```
Input:
  { password: "hunter2", apiKey: "abc123", token: "hunter2" }

Output:
  { password: "SECRET_A1", apiKey: "SECRET_B1", token: "SECRET_A1" }

Note: "hunter2" appears twice, gets same mask (SECRET_A1)
```

## Redaction Report

Every redaction must be recorded:

```typescript
interface RedactionEntry {
  fieldPath: string;      // e.g., "nodes[0].credentials.password"
  reason: 'field_name' | 'entropy' | 'prefix_match';
  originalLength: number; // NOT the original value!
  maskAssigned: string;   // e.g., "SECRET_A1"
  entropyValue?: number;  // If detected by entropy
}
```

**NEVER** include original values in the report.

## Common Pitfalls to Avoid

### 1. Logging Original Values

BAD:
```typescript
console.log(`Redacting secret: ${originalValue}`);
```

GOOD:
```typescript
console.log(`Redacting secret at ${fieldPath}, length ${originalValue.length}`);
```

### 2. Error Messages with Values

BAD:
```typescript
throw new Error(`Invalid token format: ${token}`);
```

GOOD:
```typescript
throw new Error(`Invalid token format at ${fieldPath}`);
```

### 3. Stack Traces

Ensure stack traces don't include secret values as function arguments.

### 4. Temporary Variables

Don't store secrets in variables that might be serialized:

BAD:
```typescript
const debugState = { foundSecrets: [secret1, secret2] };
```

GOOD:
```typescript
const debugState = { secretCount: 2, fieldPaths: [path1, path2] };
```

## Override Path

Users can disable redaction with `--no-redact`, but:

1. Show a loud warning
2. Require explicit confirmation
3. Mark output as "UNREDACTED" in metadata
4. Never auto-enable this in CI or shared contexts

## Testing Redaction

Use the `secrets-entropy.json` fixture which includes:
- Known secret field names
- High-entropy test strings
- False positive cases (UUIDs, base64)
- Edge cases

Verify:
- All secrets are masked
- Original values never appear in ANY output
- Determinism (run twice, compare outputs)
