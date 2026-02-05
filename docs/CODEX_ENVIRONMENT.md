# Codex Environment Setup

This repository now includes a lightweight Codex-oriented workflow for continuously updated project artifacts.

## Prerequisites
- Node.js (project uses ESM scripts)
- npm dependencies installed (`npm install`)

## One-time setup
```bash
npm install
```

## Daily loop
1. Validate repository contracts:
   ```bash
   npm run lint
   ```
2. Refresh living artifacts and active changelog:
   ```bash
   npm run artifacts:refresh
   ```
3. Optional combined bootstrap command:
   ```bash
   npm run codex:setup
   ```

## Generated outputs
- `artifacts/LIVING_ARTIFACTS.md`: current branch/revision snapshot + spec inventory.
- `artifacts/ACTIVE_CHANGELOG.md`: rolling state using current working tree + recent commits.

These artifacts are intended to be updated continuously as active documentation for operators.
