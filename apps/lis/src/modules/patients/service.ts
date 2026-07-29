import type { PrismaClient } from "@prisma/client";
import { writeAudit, type ActorContext } from "@/modules/audit/service";
import { patientInputSchema, type PatientInput } from "./schema";

export async function createPatient(prisma: PrismaClient, input: PatientInput, actor: ActorContext) {
  const data = patientInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.create({ data: { ...data, medicalRecordNumber: data.medicalRecordNumber.toUpperCase(), birthDate: new Date(`${data.birthDate}T00:00:00.000Z`) } });
    await writeAudit(tx, { ...actor, action: "PATIENT_CREATED", entityType: "Patient", entityId: patient.id, afterJson: { medicalRecordNumber: patient.medicalRecordNumber, firstName: patient.firstName, lastName: patient.lastName } });
    return patient;
  });
}
export function searchPatients(prisma: PrismaClient, query: string) {
  const q = query.trim();
  return prisma.patient.findMany({ where: q ? { OR: [{ medicalRecordNumber: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } : undefined, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 30 });
}
