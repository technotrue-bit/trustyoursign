import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { clearChartRoomsBoot, showChartRoomsOnNextBoot, takeChartRoomsBoot } from "./chartSheetIntent.ts";

afterEach(() => {
  clearChartRoomsBoot();
});

describe("chart rooms boot", () => {
  it("keeps the sheet open only for the desk that was asked for, once", () => {
    assert.equal(takeChartRoomsBoot("joey"), false);
    showChartRoomsOnNextBoot("joey");
    assert.equal(takeChartRoomsBoot("saige"), false);
    assert.equal(takeChartRoomsBoot("joey"), true);
    assert.equal(takeChartRoomsBoot("joey"), false);
  });

  it("lets The sky drop a pending chart-rooms request", () => {
    showChartRoomsOnNextBoot("saige");
    clearChartRoomsBoot();
    assert.equal(takeChartRoomsBoot("saige"), false);
  });
});
