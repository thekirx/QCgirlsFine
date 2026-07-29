import { describe, expect, it } from "vitest";

import { getHealthSnapshot } from "./service";

describe("getHealthSnapshot", () => {
  it("reports the LIS as available without depending on the analyzer gateway", () => {
    const snapshot = getHealthSnapshot({ database: "up", gateway: "down" });

    expect(snapshot).toEqual({
      status: "available",
      database: "up",
      gateway: "down",
      coreWorkflowAvailable: true,
    });
  });
});
