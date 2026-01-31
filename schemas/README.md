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

## gpt.schema.json
- **Dialect:** JSON Schema Draft-07
- **Enforcement:** `node tools/lint.mjs` (Ajv v8)
- **Posture:** strict + fail-closed (`additionalProperties: false`)
- **Scope:** all `gpts/**/gpt.json` files (UI metadata)

### Enforced invariants
- `authority` must be `"non-authoritative"`
- `status` enum: `template | draft | active | deprecated`
- Required fields: `name`, `description`, `version`, `status`, `authority`, `notes`

