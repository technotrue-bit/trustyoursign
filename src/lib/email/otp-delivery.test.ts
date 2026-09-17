import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  clearOtpDeliveryForTests,
  recordOtpDelivery,
  takeOtpDelivery,
} from "./otp-delivery.server.ts";

describe("otp delivery ledger", () => {
  beforeEach(() => clearOtpDeliveryForTests());

  it("records success and returns it once", () => {
    recordOtpDelivery("A@Example.com", { ok: true });
    const first = takeOtpDelivery("a@example.com");
    assert.equal(first?.ok, true);
    assert.equal(takeOtpDelivery("a@example.com"), null);
  });

  it("records failure with a message the UI can show", () => {
    recordOtpDelivery("visitor@example.com", {
      ok: false,
      message: "Email provider rejected the message",
    });
    const row = takeOtpDelivery("visitor@example.com");
    assert.equal(row?.ok, false);
    assert.match(row?.message ?? "", /rejected/);
  });
});
