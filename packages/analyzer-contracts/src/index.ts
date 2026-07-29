import { z } from "zod";

const resultItemSchema = z.object({
  itemIndex: z.number().int().nonnegative(),
  analyzerTestCode: z.string().min(1),
  valueType: z.enum(["NUMERIC", "TEXT", "QUALITATIVE"]),
  value: z.string().min(1),
  unit: z.string().optional(),
  flags: z.array(z.string()),
});

export const normalizedAnalyzerEnvelopeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  gatewayMessageId: z.string().min(1),
  gatewayId: z.string().min(1),
  connectionId: z.string().min(1),
  adapter: z.object({
    type: z.string().min(1),
    version: z.string().min(1),
  }),
  occurredAt: z.iso.datetime(),
  receivedAt: z.iso.datetime(),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/i),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  rawEncoding: z.enum(["UTF-8", "ASCII", "BINARY_BASE64"]),
  rawPayload: z.string(),
  accessionId: z.string().optional(),
  sampleId: z.string().optional(),
  results: z.array(resultItemSchema).min(1),
});

export type NormalizedAnalyzerEnvelope = z.infer<
  typeof normalizedAnalyzerEnvelopeSchema
>;
