import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Sql } from "../../lib/db.ts";
import { inviteRegisteredAccountToBeta, type BetaInviteMail } from "../../lib/admin/invite-beta.ts";
import {
  CLOSED_BETA_TESTER_NAME,
  accountTriggerName,
  closedBetaTesterLines,
  isClosedBetaTester,
} from "../../lib/auth/closed-beta-badge.ts";
import {
  applySessionObservation,
  resetStickySessionForTests,
} from "../../lib/auth/session-sticky.ts";
import type { AppUser } from "../../lib/auth/use-current-user.ts";
import { ClosedBetaTesterBadge } from "./ClosedBetaBadge.tsx";

function markup(role: AppUser["role"] | null, place: "menu" | "hud"): string {
  return renderToStaticMarkup(createElement(ClosedBetaTesterBadge, { role, place }));
}

const ada: AppUser = {
  id: "ada-1",
  displayName: "Ada Lovelace",
  primaryEmail: "ada@example.com",
  profileImageUrl: null,
  isDevFallback: false,
  role: "user",
};

describe("Closed Beta Tester badge", () => {
  it("names the mark in full, one word per line for the narrow phone stack", () => {
    assert.equal(CLOSED_BETA_TESTER_NAME, "Closed Beta Tester");
    assert.deepEqual(closedBetaTesterLines(), ["Closed", "Beta", "Tester"]);
    assert.equal(closedBetaTesterLines().join(" "), CLOSED_BETA_TESTER_NAME);
    assert.equal(isClosedBetaTester("beta"), true);
    assert.equal(isClosedBetaTester("user"), false);
    assert.equal(isClosedBetaTester(null), false);
    assert.equal(accountTriggerName("beta"), "Account, Closed Beta Tester");
    assert.equal(accountTriggerName("user"), "Account");
    assert.equal(accountTriggerName(undefined), "Account");
  });

  it("surfaces the badge for a beta role and stays quiet for a regular account", () => {
    const menu = markup("beta", "menu");
    const hud = markup("beta", "hud");
    assert.match(menu, /Closed Beta Tester/);
    assert.match(menu, /class="closed-beta-badge closed-beta-badge--menu"/);
    assert.doesNotMatch(menu, /closed-beta-badge--menu" aria-hidden/);
    assert.match(hud, /Closed Beta Tester/);
    assert.match(hud, /closed-beta-badge--hud" aria-hidden="true"/);
    assert.match(hud, /closed-beta-stack/);
    assert.match(hud, />Closed</);
    assert.match(hud, />Beta</);
    assert.match(hud, />Tester</);
    assert.equal(markup("user", "menu"), "");
    assert.equal(markup("user", "hud"), "");
    assert.equal(markup(null, "menu"), "");
    assert.equal(markup(null, "hud"), "");
  });

  it("reads the badge off the session role, with no extra step after sign-in", () => {
    resetStickySessionForTests();
    const seen = applySessionObservation({
      liveUser: { ...ada, role: "beta" },
      isPending: false,
      hasError: false,
      now: 5_000,
    });
    assert.equal(seen.user?.role, "beta");
    assert.match(markup(seen.user?.role ?? "user", "menu"), /Closed Beta Tester/);
    assert.match(markup(seen.user?.role ?? "user", "hud"), /closed-beta-stack/);
    assert.equal(accountTriggerName(seen.user?.role), "Account, Closed Beta Tester");

    const still = applySessionObservation({
      liveUser: null,
      isPending: true,
      hasError: false,
      now: 5_100,
    });
    assert.equal(still.user?.role, "beta");
    assert.match(markup(still.user?.role ?? "user", "hud"), /Closed Beta Tester/);

    resetStickySessionForTests();
    const regular = applySessionObservation({
      liveUser: ada,
      isPending: false,
      hasError: false,
      now: 6_000,
    });
    assert.equal(regular.user?.role, "user");
    assert.equal(markup(regular.user?.role ?? "beta", "menu"), "");
    assert.equal(markup(regular.user?.role ?? "beta", "hud"), "");
    assert.equal(accountTriggerName(regular.user?.role), "Account");
    resetStickySessionForTests();
  });

  it("still marks an invited account beta, which is the role the badge reads", async () => {
    const calls: string[] = [];
    const sql = (async (strings: TemplateStringsArray) => {
      const text = strings.join(" ");
      calls.push(text);
      if (/update "user"/i.test(text)) return [{ id: "ada-1" }];
      if (/from "user"/i.test(text)) return [{ id: "ada-1", email: "ada@example.com", name: "Ada" }];
      return [];
    }) as Sql;
    sql.query = async () => [];
    const sent: string[] = [];
    const mail: BetaInviteMail = {
      configured: true,
      sandbox: false,
      send: async (message) => {
        sent.push(message.to);
      },
    };
    const result = await inviteRegisteredAccountToBeta(sql, "ada-1", mail);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.role, "beta");
    assert.equal(result.emailed, true);
    assert.equal(sent[0], "ada@example.com");
    assert.match(calls.join("\n"), /set "role"/);
    assert.match(markup(result.role, "menu"), /Closed Beta Tester/);
    assert.match(markup(result.role, "hud"), /Closed Beta Tester/);
  });

  it("mounts the mark on the account control from the session role", () => {
    const menu = readFileSync(new URL("./AccountMenu.tsx", import.meta.url), "utf8");
    assert.match(menu, /accountTriggerName\(user\.role\)/);
    assert.match(menu, /<ClosedBetaTesterBadge role=\{user\.role\} place="hud" \/>/);
    assert.match(menu, /<ClosedBetaTesterBadge role=\{user\.role\} place="menu" \/>/);
    const users = readFileSync(new URL("./AccountSettingsPanel.tsx", import.meta.url), "utf8");
    assert.match(users, /row\.role === "beta"\) marks\.push\("Beta"\)/);
  });
});
