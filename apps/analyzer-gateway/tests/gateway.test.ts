import { describe, expect, it } from "vitest";

import { createGateway } from "../src/core/gateway.js";

describe("gateway lifecycle", () => {
  it("starts and stops the simulator independently", async () => {
    const gateway = createGateway();

    await gateway.start();
    expect(gateway.health()).toEqual({ status: "online", adapter: "simulator" });

    await gateway.stop();
    expect(gateway.health()).toEqual({ status: "offline", adapter: "simulator" });
  });
});
