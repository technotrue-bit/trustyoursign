#!/usr/bin/env node
/**
 * Probe a running app for P1-18 security headers on a document response.
 *
 * Usage:
 *   node scripts/assert-security-headers.mjs
 *   node scripts/assert-security-headers.mjs http://127.0.0.1:8080/
 *
 * Exit 0 when required headers are present; 1 otherwise. Prints a short note
 * Security can paste into the re-score checklist.
 */
import { SECURITY_HEADER_NAMES, SECURITY_HEADERS } from "./security-headers.mjs";

const target = process.argv[2] || "http://127.0.0.1:8080/";

async function main() {
  let res;
  try {
    res = await fetch(target, {
      headers: { accept: "text/html" },
      redirect: "manual",
    });
  } catch (err) {
    console.error(`assert-security-headers: fetch failed for ${target}:`, err);
    process.exit(1);
  }

  const missing = [];
  const mismatched = [];
  for (const name of SECURITY_HEADER_NAMES) {
    const got = res.headers.get(name);
    if (!got) {
      missing.push(name);
      continue;
    }
    const expected = SECURITY_HEADERS[name];
    if (got !== expected) {
      mismatched.push({ name, got, expected });
    }
  }

  console.log(`assert-security-headers: ${target} → HTTP ${res.status}`);
  for (const name of SECURITY_HEADER_NAMES) {
    const got = res.headers.get(name);
    console.log(`  ${got ? "OK" : "MISSING"}  ${name}${got ? `: ${got.slice(0, 72)}${got.length > 72 ? "…" : ""}` : ""}`);
  }

  if (missing.length || mismatched.length) {
    if (missing.length) console.error("missing:", missing.join(", "));
    for (const m of mismatched) {
      console.error(`mismatch ${m.name}:\n  got:      ${m.got}\n  expected: ${m.expected}`);
    }
    process.exit(1);
  }
  console.log("assert-security-headers: all required headers present.");
}

await main();
