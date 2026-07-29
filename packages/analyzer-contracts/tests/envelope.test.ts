import { describe, expect, it } from "vitest";

import { normalizedAnalyzerEnvelopeSchema } from "../src/index";

describe("normalized analyzer envelope", () => {
  it("accepts a versioned simulator result message", () => {
    const parsed = normalizedAnalyzerEnvelopeSchema.parse({
      schemaVersion: "1.0",
      gatewayMessageId: "msg-001",
      gatewayId: "gateway-dev",
      connectionId: "simulator-1",
      adapter: { type: "simulator", version: "1.0.0" },
      occurredAt: "2026-07-29T13:00:00.000Z",
      receivedAt: "2026-07-29T13:00:00.100Z",
      idempotencyKey: "a".repeat(64),
      rawSha256: "b".repeat(64),
      rawEncoding: "UTF-8",
      rawPayload: "SIM|QST260729-0001|GLU|112",
      accessionId: "QST260729-0001",
      results: [
        {
          itemIndex: 0,
          analyzerTestCode: "GLU",
          valueType: "NUMERIC",
          value: "112",
          unit: "mg/dL",
          flags: ["H"],
        },
      ],
    });

    expect(parsed.schemaVersion).toBe("1.0");
    expect(parsed.results).toHaveLength(1);
  });
});
