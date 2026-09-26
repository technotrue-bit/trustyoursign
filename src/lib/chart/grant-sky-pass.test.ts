import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { grantSkyPassForUser } from "./grant-sky-pass.ts";

function fakeSql(users: { id: string }[]) {
  const calls: string[] = [];
  const sql = (async (strings: TemplateStringsArray) => {
    const text = strings.join(" ");
    calls.push(text);
    if (/from "user"/i.test(text)) return users;
    return [];
  }) as Sql;
  sql.query = async () => [];
  return { sql, calls };
}

describe("grantSkyPassForUser", () => {
  it("reports success only after a real user row, then upserts the pass", async () => {
    const { sql, calls } = fakeSql([{ id: "user-1" }]);
    const result = await grantSkyPassForUser(sql, " user-1 ", "vault");
    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 2);
    assert.match(calls[0], /from "user"/);
    assert.match(calls[1], /insert into sky_pass/);
  });

  it("does not grant or insert when the user is missing", async () => {
    const { sql, calls } = fakeSql([]);
    const result = await grantSkyPassForUser(sql, "missing", "bones");
    assert.deepEqual(result, { ok: false, error: "No such user" });
    assert.equal(calls.length, 1);
    assert.equal(calls.some((text) => /insert into sky_pass/i.test(text)), false);
  });

  it("does not grant a blank id", async () => {
    const { sql, calls } = fakeSql([{ id: "user-1" }]);
    const result = await grantSkyPassForUser(sql, "   ", "free");
    assert.deepEqual(result, { ok: false, error: "No such user" });
    assert.equal(calls.length, 0);
  });
});
