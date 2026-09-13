import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { AppRls } from "./db-rls.server.ts";

const CLIENT_REACHABLE = [
  new URL("./site.ts", import.meta.url),
  new URL("./charts.ts", import.meta.url),
  new URL("./chart/sky.ts", import.meta.url),
  new URL("./owner.ts", import.meta.url),
  new URL("./db.ts", import.meta.url),
  new URL("./auth/middleware.ts", import.meta.url),
];

describe("client bundle isolation", () => {
  it("keeps Node ALS and the SQL driver off dual/client modules", () => {
    for (const url of CLIENT_REACHABLE) {
      const src = readFileSync(url, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.equal(src.includes("from \"node:async_hooks\""), false, String(url));
      assert.equal(src.includes("from \"@/lib/db.server\""), false, `static db.server in ${url.pathname}`);
      assert.equal(/from ["']@\/lib\/db-rls/.test(src), false, String(url));
      assert.equal(src.includes("from \"./db-rls"), false, String(url));
    }
  });

  it("scopes RLS context on Node", async () => {
    let seen: string | undefined;
    await AppRls.run({ userId: "u1" }, async () => {
      seen = AppRls.current()?.userId;
    });
    assert.equal(seen, "u1");
    assert.equal(AppRls.current(), undefined);
  });
});
