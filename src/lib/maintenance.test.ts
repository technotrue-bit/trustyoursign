import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asAccountRole, isAccountRole } from "./auth/account-role.ts";
import { isMaintenanceExemptPath } from "./maintenance-paths.ts";

describe("account role", () => {
  it("keeps beta and reads everything else as a regular account", () => {
    assert.equal(asAccountRole("beta"), "beta");
    assert.equal(asAccountRole("user"), "user");
    assert.equal(asAccountRole("admin"), "user");
    assert.equal(asAccountRole(null), "user");
    assert.equal(isAccountRole("beta"), true);
    assert.equal(isAccountRole("owner"), false);
  });
});

describe("maintenance exempt paths", () => {
  it("leaves sign-in and auth callbacks open", () => {
    assert.equal(isMaintenanceExemptPath("/login"), true);
    assert.equal(isMaintenanceExemptPath("/login/"), true);
    assert.equal(isMaintenanceExemptPath("/reset-password"), true);
    assert.equal(isMaintenanceExemptPath("/signup"), true);
    assert.equal(isMaintenanceExemptPath("/register"), true);
    assert.equal(isMaintenanceExemptPath("/maintenance"), true);
    assert.equal(isMaintenanceExemptPath("/api/auth/callback/google"), true);
    assert.equal(isMaintenanceExemptPath("/auth/popup"), true);
  });

  it("closes the sky and the desk", () => {
    assert.equal(isMaintenanceExemptPath("/"), false);
    assert.equal(isMaintenanceExemptPath("/admin"), false);
    assert.equal(isMaintenanceExemptPath("/admin/users"), false);
    assert.equal(isMaintenanceExemptPath("/account"), false);
  });
});
