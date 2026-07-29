import type { PrismaClient } from "@prisma/client";
import { writeAudit, type ActorContext } from "@/modules/audit/service";
import { orderInputSchema, type OrderInput } from "./schema";

function dateKey(now = new Date()) { return now.toISOString().slice(0,10); }
export async function createOrder(prisma: PrismaClient, input: OrderInput, actor: ActorContext) {
  const data = orderInputSchema.parse(input); const uniqueTests = [...new Set(data.testDefinitionIds)]; const now = new Date(); const key = dateKey(now);
  return prisma.$transaction(async (tx) => {
    const counter = await tx.accessionCounter.upsert({ where: { siteCode_businessDate: { siteCode: "QC", businessDate: new Date(`${key}T00:00:00.000Z`) } }, update: { nextValue: { increment: 1 } }, create: { siteCode: "QC", businessDate: new Date(`${key}T00:00:00.000Z`), nextValue: 2 } });
    const sequence = counter.nextValue - 1; const accessionNumber = `QC${key.replaceAll("-","")}-${String(sequence).padStart(4,"0")}`;
    const order = await tx.labOrder.create({ data: { accessionNumber, patientId: data.patientId, priority: data.priority, requestingPhysician: data.requestingPhysician, source: data.source, clinicalNotes: data.clinicalNotes, tests: { create: uniqueTests.map((testDefinitionId, index) => ({ testDefinitionId, sequence: index + 1 })) }, specimen: { create: { sampleId: accessionNumber, type: "Primary specimen" } }, resultSet: { create: {} } }, include: { patient: true, tests: { include: { testDefinition: { include: { ranges: true } } }, orderBy: { sequence: "asc" } }, resultSet: true } });
    await writeAudit(tx, { ...actor, action: "ORDER_CREATED", entityType: "LabOrder", entityId: order.id, afterJson: { accessionNumber, patientId: data.patientId, testDefinitionIds: uniqueTests } });
    return order;
  }, { isolationLevel: "Serializable" });
}
export function getWorkQueue(prisma: PrismaClient, filters: { query?: string; status?: "ACTIVE"|"RELEASED"|"CANCELED" }) {
  const q = filters.query?.trim();
  return prisma.labOrder.findMany({ where: { status: filters.status ?? "ACTIVE", ...(q ? { OR: [{ accessionNumber: { contains: q, mode:"insensitive" } }, { patient: { is: { OR: [{ firstName:{contains:q,mode:"insensitive"}},{lastName:{contains:q,mode:"insensitive"}},{medicalRecordNumber:{contains:q,mode:"insensitive"}}] } } }] } : {}) }, include: { patient:true, tests:{include:{testDefinition:true},orderBy:{sequence:"asc"}}, resultSet:true }, orderBy: [{ priority:"desc" },{ createdAt:"asc" }], take:100 });
}
