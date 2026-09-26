import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEON_CONNECTION_TIMEOUT_MS,
  NEON_POOL_MAX,
  NEON_QUERY_TIMEOUT_MS,
  databaseTimeoutError,
  directNeonHostWarning,
  neonHostKind,
  neonPoolConfig,
} from "./db-pool.ts";

const SECRET = "postgresql://neondb_owner:super-secret@ep-example.us-east-1.aws.neon.tech/neondb";

describe("neon host classification", () => {
  it("recognises the PgBouncer pooled host", () => {
    assert.equal(
      neonHostKind("postgresql://user:pw@ep-cool-darkness-pooler.us-east-2.aws.neon.tech/neondb"),
      "pooled",
    );
    assert.equal(
      neonHostKind("postgres://u:p@ep-abc-pooler.c-3.us-east-1.aws.neon.tech/db?sslmode=require"),
      "pooled",
    );
  });

  it("recognises a direct compute host", () => {
    assert.equal(
      neonHostKind("postgresql://user:pw@ep-cool-darkness.us-east-2.aws.neon.tech/neondb"),
      "direct",
    );
  });

  it("ignores non-neon urls", () => {
    assert.equal(neonHostKind("postgres://localhost/app"), "other");
    assert.equal(neonHostKind("not a url"), "other");
  });

  it("warns on a direct host without repeating the url", () => {
    const warning = directNeonHostWarning(neonHostKind(SECRET));
    assert.ok(warning);
    assert.match(warning, /-pooler/);
    assert.equal(warning.includes("super-secret"), false);
    assert.equal(warning.includes("ep-example"), false);
    assert.equal(directNeonHostWarning("pooled"), null);
    assert.equal(directNeonHostWarning("other"), null);
  });
});

describe("pool timeouts", () => {
  it("caps the pool and fails a starved checkout or query within 8s", () => {
    const config = neonPoolConfig("postgres://localhost/app");
    assert.equal(config.max, NEON_POOL_MAX);
    assert.equal(config.max, 4);
    assert.equal(config.connectionTimeoutMillis, NEON_CONNECTION_TIMEOUT_MS);
    assert.equal(config.query_timeout, NEON_QUERY_TIMEOUT_MS);
    assert.ok(config.connectionTimeoutMillis <= 8_000);
    assert.ok(config.query_timeout <= 8_000);
    assert.equal(config.allowExitOnIdle, true);
  });

  it("replaces a timeout with a message that does not include the url", () => {
    const wrapped = databaseTimeoutError(
      new Error(`timeout exceeded when trying to connect ${SECRET}`),
    );
    assert.ok(wrapped);
    assert.match(wrapped.message, /timed out/);
    assert.match(wrapped.message, /-pooler/);
    assert.equal(wrapped.message.includes("super-secret"), false);
    assert.equal(wrapped.message.includes("ep-example"), false);
    assert.equal(databaseTimeoutError(new Error("relation does not exist")), null);
  });
});
