import { z } from "zod";
export const orderInputSchema = z.object({ patientId: z.uuid(), priority: z.enum(["ROUTINE","STAT"]), requestingPhysician: z.string().min(1).max(120), source: z.string().min(1).max(120), clinicalNotes: z.string().max(500).optional().nullable(), testDefinitionIds: z.array(z.uuid()).min(1) });
export type OrderInput = z.infer<typeof orderInputSchema>;
