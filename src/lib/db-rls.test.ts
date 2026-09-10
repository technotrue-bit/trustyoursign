import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { AppRls } from "./db-rls.ts";

describe("AppRls", () => {
  it("does not statically import node:async_hooks (that crash-loads the client)", () => {
    const src = readFileSync(new URL("./db-rls.ts", import.meta.url), "utf8");
    assert.equal(src.includes("from \"node:async_hooks\""), false);
    assert.equal(src.includes("from 'node:async_hooks'"), false);
  });

  it("still scopes context on Node", async () => {
    let seen: string | undefined;
    await AppRls.run({ userId: "u1" }, async () => {
      seen = AppRls.current()?.userId;
    });
    assert.equal(seen, "u1");
    assert.equal(AppRls.current(), undefined);
  });
});
