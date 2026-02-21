# Configuration

Flow Profile currently supports lint configuration via a `.flowprofilerc.json` file in the working directory (or an explicit `--config` path).

## File format

```json
{
  "rules": {
    "RISK_NO_CATCH": "error",
    "RISK_INFINITE_LOOP": "warn",
    "RISK_HIGH_ENTROPY": "warn",
    "RISK_INJECTION_PRONE": "off"
  },
  "strictMode": true,
  "entropyThreshold": 4.5,
  "failOn": "error"
}
```

### rules

Rules map to one of:

- `error`
- `warn`
- `off`

When a rule is set to `off`, it is skipped entirely. If a rule is not listed, the default severity mapping is used (`high` -> `error`, everything else -> `warn`).

### strictMode

Controls whether entropy-based redaction rules run during linting.

- `true` (default): enable entropy checks
- `false`: skip entropy checks

### entropyThreshold

Overrides the entropy threshold used for high-entropy detection. If omitted, the CLI default is used.

### failOn

Controls the exit code threshold when running `flow-profile lint`:

- `error` (default)
- `warn`
- `off`

## Available rule IDs

- `RISK_NO_CATCH`
- `RISK_INFINITE_LOOP`
- `RISK_HIGH_ENTROPY`
- `RISK_INJECTION_PRONE`

## Notes

- The CLI also accepts `--only` and `--skip` to control rule selection at runtime.
- The configuration file is currently used to control lint rule levels and disabling. Other fields may be added over time.
