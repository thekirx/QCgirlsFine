import { z } from "zod";
export const patientInputSchema = z.object({
  medicalRecordNumber: z.string().min(2).max(40), firstName: z.string().min(1).max(80), middleName: z.string().max(80).optional().nullable(), lastName: z.string().min(1).max(80), birthDate: z.iso.date(), sex: z.enum(["FEMALE","MALE","OTHER","UNKNOWN"]), phone: z.string().max(40).optional().nullable(), address: z.string().max(300).optional().nullable(),
});
export type PatientInput = z.infer<typeof patientInputSchema>;
