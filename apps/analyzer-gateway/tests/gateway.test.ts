import { describe, expect, it } from "vitest";

import { createGateway } from "../src/core/gateway.js";
import { FileSpoolStore } from "../src/storage/file-store.js";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("gateway lifecycle", () => {
  it("starts and stops the simulator independently", async () => {
    const gateway = createGateway();

    await gateway.start();
    expect(gateway.health()).toEqual({ status: "online", adapter: "simulator" });

    await gateway.stop();
    expect(gateway.health()).toEqual({ status: "offline", adapter: "simulator" });
  });

  it("persists pending envelopes through a replaceable spool interface", async () => {
    const directory = await mkdtemp(join(tmpdir(), "questcare-spool-"));
    const store = new FileSpoolStore(directory);
    await store.put("msg-001", { accessionId: "QC20260729-0001" });
    expect(JSON.parse(await readFile(join(directory, "pending", "msg-001.json"), "utf8"))).toEqual({ accessionId: "QC20260729-0001" });
  });
});
