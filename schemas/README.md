# Schemas

This directory contains machine-verifiable contracts enforced by `tools/lint.mjs` and CI.

## spec.manifest.schema.json
- **Dialect:** JSON Schema Draft-07
- **Enforcement:** `node tools/lint.mjs` (Ajv v8)
- **Posture:** strict + fail-closed (`additionalProperties: false`)

### Rationale
Draft-07 is:
- widely supported
- stable
- sufficient for current invariants

### Change policy
Upgrading schema dialect is a governed change:
- update `$schema`
- update validator configuration if needed
- keep fail-closed behavior
- ensure CI remains the enforcement point
