import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { loginBotCheckConfigured } from "./login-bot-check.ts";

const SECRET = "TURNSTILE_SECRET_KEY";
const SITE = "VITE_TURNSTILE_SITE_KEY";

describe("login bot check", () => {
  it("stays off until both keys are set", () => {
    assert.equal(loginBotCheckConfigured({}), false);
    assert.equal(loginBotCheckConfigured({ [SECRET]: "secret-set" }), false);
    assert.equal(loginBotCheckConfigured({ [SITE]: "site-set" }), false);
    assert.equal(
      loginBotCheckConfigured({ [SECRET]: "   ", [SITE]: "site-set" }),
      false,
    );
    assert.equal(
      loginBotCheckConfigured({ [SECRET]: "secret-set", [SITE]: "  " }),
      false,
    );
    assert.equal(
      loginBotCheckConfigured({ [SECRET]: "secret-set", [SITE]: "site-set" }),
      true,
    );
    assert.equal(
      loginBotCheckConfigured({ [SECRET]: "  secret-set  ", [SITE]: " site-set " }),
      true,
    );
  });

  it("registers the check only behind that same gate", () => {
    const server = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
    assert.match(server, /\.\.\.\(loginBotCheckConfigured\(\)\s*\?\s*\[\s*captcha\(/);
    const gateAt = server.indexOf("loginBotCheckConfigured()");
    const captchaAt = server.indexOf("captcha({");
    assert.ok(gateAt !== -1 && captchaAt !== -1 && gateAt < captchaAt);
  });

  it("the sign-in page waits for the server before showing the check", () => {
    const login = readFileSync(new URL("../../routes/login.tsx", import.meta.url), "utf8");
    const availability = readFileSync(new URL("./email-otp.ts", import.meta.url), "utf8");
    assert.match(login, /botCheck && turnstileSiteKey\(\) \? <TurnstileWidget \/>/);
    assert.equal(login.includes("{turnstileSiteKey() ? <TurnstileWidget /> : null}"), false);
    assert.match(availability, /botCheck: loginBotCheckConfigured\(\)/);
  });
});
