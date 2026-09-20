import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import yaml from "js-yaml";

/**
 * Guard for the failure mode that took every run of `bump-site-version.yml`
 * down (see PR #103): a workflow file GitHub cannot parse fails *every* run at
 * startup — zero jobs, no logs, no signal — and nothing in the repo noticed for
 * 37 runs.
 *
 * `js-yaml` is a runtime dependency of this project (it is in package-lock), so
 * the guard is expected to always be able to run; it fails loudly rather than
 * skipping if the parser is missing.
 */

const WORKFLOW_DIR = path.resolve(process.cwd(), ".github/workflows");

function workflowFiles() {
  const entries = readdirSync(WORKFLOW_DIR, { withFileTypes: true });
  assert.ok(entries.length > 0, `${WORKFLOW_DIR} is empty — run the tests from the repo root`);
  return readdirSync(WORKFLOW_DIR).filter((name) => /\.ya?ml$/.test(name));
}

function loadWorkflow(file) {
  return yaml.load(readFileSync(path.join(WORKFLOW_DIR, file), "utf8"));
}

/** Triggers. NOTE: YAML 1.1 parses a bare `on:` key as the boolean `true`. */
function triggersOf(doc) {
  return doc.on ?? doc["true"];
}

/** Every `if:` in the file, with a label for the failure message. */
function conditionsOf(doc) {
  const found = [];
  for (const [id, job] of Object.entries(doc.jobs ?? {})) {
    if (job.if !== undefined) found.push([`job '${id}'`, job.if]);
    for (const step of job.steps ?? []) {
      if (step.if !== undefined) found.push([`step '${step.name ?? step.uses}'`, step.if]);
    }
  }
  return found;
}

test("every workflow file parses as YAML", () => {
  const files = workflowFiles();
  assert.ok(files.length > 0, "no workflow files found");
  for (const file of files) {
    const text = readFileSync(path.join(WORKFLOW_DIR, file), "utf8");
    try {
      yaml.load(text);
    } catch (err) {
      assert.fail(`${file} is not valid YAML — GitHub would fail every run: ${err.message}`);
    }
  }
});

test("every workflow declares triggers and jobs with real steps", () => {
  for (const file of workflowFiles()) {
    const doc = loadWorkflow(file);
    assert.ok(doc && typeof doc === "object", `${file}: empty or non-mapping workflow`);
    assert.ok(triggersOf(doc), `${file}: no 'on' triggers`);
    assert.ok(doc.jobs && typeof doc.jobs === "object", `${file}: no 'jobs'`);
    for (const [id, job] of Object.entries(doc.jobs)) {
      assert.ok(job["runs-on"] || job.uses, `${file}: job '${id}' has neither 'runs-on' nor 'uses'`);
      if (job["runs-on"]) {
        assert.ok(Array.isArray(job.steps) && job.steps.length > 0, `${file}: job '${id}' has no steps`);
      }
    }
  }
});

test("no `if:` was split by a colon inside an unquoted expression", () => {
  // The exact #103 shape:
  //   if: ${{ !contains(github.event.head_commit.message, 'chore(site): bump version') }}
  // The value starts with `${{`, so YAML reads it as a PLAIN scalar and the `: `
  // inside the quoted fragment becomes a mapping separator — "mapping values are
  // not allowed here". Anything non-string where a condition belongs is that bug,
  // and it fails here rather than in a silent, zero-job run on GitHub.
  for (const file of workflowFiles()) {
    const doc = loadWorkflow(file);
    for (const [label, condition] of conditionsOf(doc)) {
      assert.equal(
        typeof condition,
        "string",
        `${file}: ${label} condition parsed as ${typeof condition} — quote the whole expression`,
      );
    }
  }
});
