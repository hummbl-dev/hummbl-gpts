# Tools

## lint.mjs
Fail-closed lint for HUMMBL GPT specs.

### Run
```bash
node tools/lint.mjs
```

### What it checks

* spec.manifest.json minimal schema integrity
* required files present per spec
* OUTPUT_FORMAT required sections exist + in order
* CAES OUTPUT_FORMAT bucket headings present
* prohibited authority leakage phrases (affirmative uses only)
* portability violations (OpenAI / Store / UI feature coupling)
* template sanity (status, empty name/description)

### Exit codes
* `0` = all checks passed
* `1` = errors found (printed to stderr)

### Philosophy
Fail-closed: if a check cannot be performed, it fails.  
Context-aware: negations ("does not approve") are allowed.  
Governance-first: authority leakage is blocked at lint time.

## generate-living-artifacts.mjs
Generates continuously refreshable operations docs for Codex workflows.

### Run
```bash
node tools/generate-living-artifacts.mjs
```

### Outputs
- `artifacts/LIVING_ARTIFACTS.md`
- `artifacts/ACTIVE_CHANGELOG.md`
