#!/usr/bin/env node
/**
 * HUMMBL GPT Specs Linter (minimal, fail-closed)
 *
 * Checks:
 * - spec.manifest.json: JSON Schema validation (Draft 2020-12)
 * - spec.manifest.json: required top-level shape (minimal schema-ish)
 * - per spec_id: required files exist
 * - OUTPUT_FORMAT.md: required sections exist + order matches manifest
 * - CAES OUTPUT_FORMAT: bucket headings present (### Necessary/Indicated/Possible)
 * - prohibited phrases scan (authority leakage) outside NON_CLAIMS.md
 * - portability violations (platform lock-in) scan (conservative)
 * - _template sanity: ensure template status remains template and name/description blank
 *
 * Exit code: 0 ok, 1 errors
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = path.join(REPO_ROOT, "spec.manifest.json");

function readText(p) {
  return fs.readFileSync(p, "utf8");
}
function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
function listFilesRec(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function fail(errors, warnings) {
  if (warnings.length) {
    console.error("\nWARNINGS:");
    for (const w of warnings) console.error(`- ${w}`);
  }
  console.error("\nERRORS:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

function ok(warnings) {
  if (warnings.length) {
    console.error("\nWARNINGS:");
    for (const w of warnings) console.error(`- ${w}`);
  }
  console.log("OK: lint checks passed");
  process.exit(0);
}

function isObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parseManifest() {
  if (!exists(MANIFEST_PATH)) {
    return { errors: [`Missing ${path.relative(REPO_ROOT, MANIFEST_PATH)}`], warnings: [] };
  }
  let json;
  try {
    json = JSON.parse(readText(MANIFEST_PATH));
  } catch (e) {
    return { errors: [`Invalid JSON in spec.manifest.json: ${String(e.message || e)}`], warnings: [] };
  }
  return { json, errors: [], warnings: [] };
}

/** Minimal schema-ish check. Fail closed on missing critical keys. */
function validateManifestShape(m) {
  const errors = [];
  const warnings = [];

  const reqTop = ["manifest_version", "repo", "principles", "routing", "specs"];
  for (const k of reqTop) if (!(k in m)) errors.push(`spec.manifest.json missing top-level key: ${k}`);

  if (!isObject(m.repo)) errors.push("spec.manifest.json repo must be an object");
  if (!isObject(m.principles)) errors.push("spec.manifest.json principles must be an object");
  if (!isObject(m.routing)) errors.push("spec.manifest.json routing must be an object");
  if (!Array.isArray(m.specs)) errors.push("spec.manifest.json specs must be an array");

  if (isObject(m.routing)) {
    if (typeof m.routing.default_spec_id !== "string")
      errors.push("routing.default_spec_id must be a string");
    if (!Array.isArray(m.routing.allowed_spec_ids))
      errors.push("routing.allowed_spec_ids must be an array");
  }

  if (Array.isArray(m.specs)) {
    const seen = new Set();
    for (const s of m.specs) {
      if (!isObject(s)) {
        errors.push("specs[] must contain objects");
        continue;
      }
      const sid = s.spec_id;
      if (typeof sid !== "string" || !sid.length) errors.push("specs[].spec_id must be a non-empty string");
      else {
        if (seen.has(sid)) errors.push(`Duplicate spec_id in specs[]: ${sid}`);
        seen.add(sid);
      }
      if (!isObject(s.paths)) errors.push(`spec ${sid}: paths must be an object`);
      if (!isObject(s.contracts)) errors.push(`spec ${sid}: contracts must be an object`);
      if (isObject(s.contracts)) {
        if (s.contracts.output_format_required !== true)
          warnings.push(`spec ${sid}: contracts.output_format_required is not true (currently: ${String(s.contracts.output_format_required)})`);
      }
    }
  }

  // Soft check: VERSION vs baseline tag. Not an error (tag != version).
  if (isObject(m.repo) && typeof m.repo.baseline_tag === "string") {
    const versionPath = path.join(REPO_ROOT, "VERSION");
    if (exists(versionPath)) {
      const v = readText(versionPath).trim();
      if (v && !m.repo.baseline_tag.includes(v)) {
        warnings.push(
          `repo.baseline_tag (${m.repo.baseline_tag}) does not include VERSION (${v}). This may be intentional.`
        );
      }
    }
  }

  return { errors, warnings };
}

/** Extract headings: lines starting with '## ' only (your contracts use these). */
function extractH2Headings(mdText) {
  return mdText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("## "))
    .map((l) => l.replace(/^##\s+/, "").trim());
}

/** Find headings in order, fail if missing or out of order. */
function checkRequiredSectionsInOrder(filePath, requiredSections) {
  const errors = [];
  const text = readText(filePath);
  const headings = extractH2Headings(text);

  let lastIndex = -1;
  for (const sec of requiredSections) {
    const idx = headings.indexOf(sec);
    if (idx === -1) {
      errors.push(`${rel(filePath)} missing required section header: '## ${sec}'`);
      continue;
    }
    if (idx < lastIndex) {
      errors.push(`${rel(filePath)} section order violation: '${sec}' appears before a prior required section`);
    }
    lastIndex = idx;
  }
  return errors;
}

function rel(p) {
  return path.relative(REPO_ROOT, p);
}

/** Prohibited patterns: fail if seen in affirmative contexts. */
const AUTHORITY_LEAK_PATTERNS = [
  // Only catch affirmative uses, not negations
  /\b(will|can|must|shall|does)\s+approve\b/i,
  /\b(will|can|must|shall|does)\s+enforce\b/i,
  /\b(will|can|must|shall|does)\s+validate\b/i,
  /\b(will|can|must|shall|does)\s+authorize\b/i,
  /\b(will|can|must|shall|does)\s+guarantee\b/i,
  /\b(provides?|offers?|grants?)\s+(approval|validation|authorization|enforcement)\b/i,
  /\b(approved|validated|authorized|enforced)\s+by\s+this\s+(GPT|tool)\b/i,
  /\bmust comply\b/i
];

/** Portability violations: conservative bans. (ChatGPT/Codex are allowed; OpenAI/store are not.) */
const PORTABILITY_BANS = [
  /\bGPT Store\b/i,
  /\bChatGPT Store\b/i,
  /\bOpenAI\b/i,
  /\bGPT Builder\b/i,
  /\bfunction calling\b/i
];

function scanFileForPatterns(filePath, patterns) {
  const text = readText(filePath);
  const hits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of patterns) {
      if (re.test(line)) {
        hits.push(`${rel(filePath)}:${i + 1}: ${re} -> ${line.trim()}`);
      }
    }
  }
  return hits;
}

function checkRequiredFiles(spec) {
  const errors = [];
  const p = spec.paths || {};
  const requiredPathKeys = ["system_prompt", "non_claims", "output_format", "operator_usage", "ui_mirror"];

  for (const k of requiredPathKeys) {
    if (typeof p[k] !== "string" || !p[k].length) {
      errors.push(`spec ${spec.spec_id}: paths.${k} missing or not a string`);
      continue;
    }
    const abs = path.join(REPO_ROOT, p[k]);
    if (!exists(abs)) errors.push(`spec ${spec.spec_id}: missing file ${p[k]}`);
  }
  return errors;
}

function checkFilesTrackedByGit(spec) {
  const errors = [];
  const p = spec.paths || {};
  const requiredPathKeys = ["system_prompt", "non_claims", "output_format", "operator_usage", "ui_mirror"];

  for (const k of requiredPathKeys) {
    if (typeof p[k] !== "string" || !p[k].length) continue; // already caught by checkRequiredFiles
    
    const relPath = p[k];
    try {
      const result = execSync(`git ls-files -- "${relPath}"`, { 
        cwd: REPO_ROOT, 
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      
      if (!result) {
        errors.push(`spec ${spec.spec_id}: required file ${relPath} exists but is not tracked by git (run: git add ${relPath})`);
      }
    } catch (e) {
      // Git command failed - could be not in a git repo, but fail closed
      errors.push(`spec ${spec.spec_id}: failed to check git tracking for ${relPath} (fail-closed): ${String(e.message || e)}`);
    }
  }
  return errors;
}

function checkTemplateSanity() {
  const errors = [];
  const warnings = [];

  const templateGptJson = path.join(REPO_ROOT, "gpts/_template/gpt.json");
  if (!exists(templateGptJson)) return { errors: ["Missing gpts/_template/gpt.json"], warnings };

  let j;
  try {
    j = JSON.parse(readText(templateGptJson));
  } catch (e) {
    return { errors: [`Invalid JSON in gpts/_template/gpt.json: ${String(e.message || e)}`], warnings };
  }

  if (j.status !== "template") errors.push("gpts/_template/gpt.json status must be 'template'");
  if (typeof j.name === "string" && j.name.trim() !== "")
    errors.push("gpts/_template/gpt.json name must be empty string");
  if (typeof j.description === "string" && j.description.trim() !== "")
    errors.push("gpts/_template/gpt.json description must be empty string");

  // Soft: template should remain a stub. We don't over-specify content here.
  return { errors, warnings };
}

function main() {
  const errors = [];
  const warnings = [];

  const parsed = parseManifest();
  errors.push(...parsed.errors);
  warnings.push(...parsed.warnings);
  if (errors.length) fail(errors, warnings);

  const manifest = parsed.json;

  // JSON Schema validation (Draft 2020-12) — fail closed
  const schemaPath = path.join(REPO_ROOT, "schemas/spec.manifest.schema.json");
  if (!exists(schemaPath)) {
    errors.push(`Missing ${rel(schemaPath)} (required for manifest schema validation)`);
    fail(errors, warnings);
  }

  let schema;
  try {
    schema = JSON.parse(readText(schemaPath));
  } catch (e) {
    errors.push(`Invalid JSON in ${rel(schemaPath)}: ${String(e.message || e)}`);
    fail(errors, warnings);
  }

  try {
    const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(manifest);
    if (!valid) {
      const msg = (validate.errors || [])
        .map((er) => `${er.instancePath || "/"} ${er.message}`)
        .join("; ");
      errors.push(`spec.manifest.json fails JSON Schema validation: ${msg}`);
      fail(errors, warnings);
    }
  } catch (e) {
    errors.push(`Schema validator failure (fail-closed): ${String(e.message || e)}`);
    fail(errors, warnings);
  }

  const shape = validateManifestShape(manifest);
  errors.push(...shape.errors);
  warnings.push(...shape.warnings);
  if (errors.length) fail(errors, warnings);

  // Routing integrity
  const allowed = new Set(manifest.routing.allowed_spec_ids || []);
  if (!allowed.has(manifest.routing.default_spec_id)) {
    errors.push(
      `routing.default_spec_id (${manifest.routing.default_spec_id}) is not in routing.allowed_spec_ids`
    );
  }

  // Per spec checks
  for (const spec of manifest.specs) {
    const sid = spec.spec_id;
    if (!allowed.has(sid)) {
      errors.push(`spec ${sid} is present in specs[] but not in routing.allowed_spec_ids`);
    }

    // Required files
    errors.push(...checkRequiredFiles(spec));

    // Git tracking enforcement (fail-closed)
    errors.push(...checkFilesTrackedByGit(spec));

    // OUTPUT_FORMAT required sections + order
    if (spec.contracts?.output_format_required === true) {
      const ofPath = path.join(REPO_ROOT, spec.paths.output_format);
      const reqSecs = spec.contracts.required_sections_in_output;
      if (Array.isArray(reqSecs) && reqSecs.length) {
        errors.push(...checkRequiredSectionsInOrder(ofPath, reqSecs));
      } else {
        warnings.push(`spec ${sid}: contracts.required_sections_in_output missing/empty; skipping section enforcement`);
      }
    }

    // CAES bucket headings must exist in CAES OUTPUT_FORMAT (governance-critical)
    if (sid === "gpt.caes-classifier") {
      const ofPath = path.join(REPO_ROOT, spec.paths.output_format);
      const text = readText(ofPath);
      const mustHave = ["### Necessary", "### Indicated", "### Possible"];
      for (const h of mustHave) {
        if (!text.includes(h)) errors.push(`${rel(ofPath)} missing required bucket heading: '${h}'`);
      }
    }
  }

  // Prohibited patterns scan across repo spec files
  const gptsDir = path.join(REPO_ROOT, "gpts");
  if (exists(gptsDir)) {
    const files = listFilesRec(gptsDir).filter((p) => p.endsWith(".md") || p.endsWith(".json"));
    for (const f of files) {
      // Authority phrases allowed inside NON_CLAIMS only
      if (!f.endsWith("NON_CLAIMS.md")) {
        const hits = scanFileForPatterns(f, AUTHORITY_LEAK_PATTERNS);
        for (const h of hits) errors.push(`authority-leak: ${h}`);
      }
      // Portability bans apply everywhere (including NON_CLAIMS); keep these out entirely.
      const phits = scanFileForPatterns(f, PORTABILITY_BANS);
      for (const h of phits) errors.push(`portability-violation: ${h}`);
    }
  } else {
    errors.push("Missing gpts/ directory");
  }

  // Template sanity
  const tpl = checkTemplateSanity();
  errors.push(...tpl.errors);
  warnings.push(...tpl.warnings);

  if (errors.length) fail(errors, warnings);
  ok(warnings);
}

main();
