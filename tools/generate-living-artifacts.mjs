#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'artifacts');

function sh(cmd, fallback = '') {
  try {
    return execSync(cmd, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return fallback;
  }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function relFromRoot(p) {
  return path.relative(root, p).replaceAll('\\', '/');
  return path.relative(root, p).replaceAll('\\\\', '/');
}

function gatherSpecs(manifest) {
  return (manifest.specs || []).map((s) => ({
    id: s.spec_id,
    status: s.status || 'unknown',
    systemPrompt: s.paths?.system_prompt,
    outputFormat: s.paths?.output_format,
    nonClaims: s.paths?.non_claims,
    operatorUsage: s.paths?.operator_usage
  }));
}

function getWorkingTreeSnapshot() {
  // Exclude generated/ephemeral paths so status reflects actionable edits.
  const status = sh(
    "git status --short -- ':!artifacts/**' ':!node_modules/**'",
    ''
  );
  return status || '(clean)';
}


function generateLivingArtifacts(manifest, specs, meta) {
function generateLivingArtifacts(manifest, specs) {
  const now = new Date().toISOString();
  const branch = sh('git rev-parse --abbrev-ref HEAD', 'unknown');
  const head = sh('git rev-parse --short HEAD', 'unknown');

  const lines = [];
  lines.push('# Living Artifacts');
  lines.push('');
  lines.push('This file is generated and intended to be refreshed continuously as the repository changes.');
  lines.push('');
  lines.push('## Runtime Snapshot');
  lines.push(`- Generated at (UTC): ${now}`);
  lines.push(`- Branch: ${branch}`);
  lines.push(`- HEAD: ${head}`);
  lines.push(`- Manifest version: ${manifest.manifest_version || 'unknown'}`);
  lines.push(`- Default spec: ${manifest.routing?.default_spec_id || 'unknown'}`);
  lines.push('');
  lines.push('## Spec Inventory');
  for (const s of specs) {
    lines.push(`- ${s.id} (${s.status})`);
    lines.push(`  - SYSTEM_PROMPT: ${s.systemPrompt}`);
    lines.push(`  - OUTPUT_FORMAT: ${s.outputFormat}`);
    lines.push(`  - NON_CLAIMS: ${s.nonClaims}`);
    lines.push(`  - OPERATOR_USAGE: ${s.operatorUsage}`);
  }
  lines.push('');
  lines.push('## Governance Posture (from repo governance documents)');
  lines.push('- Governance-first and artifact-driven.');
  lines.push('- Interfaces and constraints, not canonical truth or execution authority.');
  lines.push('- Vendor-neutral, prompt-portable behavior only.');
  lines.push('');
  lines.push('## Refresh Command');
  lines.push('```bash');
  lines.push('npm run artifacts:refresh');
  lines.push('```');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function generateActiveChangelog(meta) {
function generateActiveChangelog() {
  const now = new Date().toISOString();
  const status = sh('git status --short', '(clean)');
  const recent = sh('git log --oneline -n 10', 'No git history available.');

  const lines = [];
  lines.push('# Active Change Log');
  lines.push('');
  lines.push('Rolling operational log generated from repository state.');
  lines.push('');
  lines.push('## Working Tree (excluding generated artifacts and node_modules)');
  lines.push('```text');
  lines.push(meta.workingTree);
  lines.push(`- Refreshed at (UTC): ${now}`);
  lines.push('');
  lines.push('## Working Tree');
  lines.push('```text');
  lines.push(status || '(clean)');
  lines.push('```');
  lines.push('');
  lines.push('## Recent Commits');
  lines.push('```text');
  lines.push(recent);
  lines.push('```');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function main() {
  const manifestPath = path.join(root, 'spec.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Missing spec.manifest.json; cannot generate artifacts.');
    process.exit(1);
  }

  const manifest = readJson(manifestPath);
  const specs = gatherSpecs(manifest);
  ensureDir(outDir);

  const meta = {
    workingTree: getWorkingTreeSnapshot()
  };

  const livingPath = path.join(outDir, 'LIVING_ARTIFACTS.md');
  const activePath = path.join(outDir, 'ACTIVE_CHANGELOG.md');

  writeFile(livingPath, generateLivingArtifacts(manifest, specs, meta));
  writeFile(activePath, generateActiveChangelog(meta));
  const livingPath = path.join(outDir, 'LIVING_ARTIFACTS.md');
  const activePath = path.join(outDir, 'ACTIVE_CHANGELOG.md');

  writeFile(livingPath, generateLivingArtifacts(manifest, specs));
  writeFile(activePath, generateActiveChangelog());

  console.log(`Generated ${relFromRoot(livingPath)}`);
  console.log(`Generated ${relFromRoot(activePath)}`);
}

main();
