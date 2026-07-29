import type { Prisma, PrismaClient } from "@prisma/client";

export type ActorContext = { actorId: string; requestId: string; workstation?: string };
type Db = PrismaClient | Prisma.TransactionClient;

export async function writeAudit(db: Db, event: ActorContext & { action: string; entityType: string; entityId: string; beforeJson?: Prisma.InputJsonValue; afterJson?: Prisma.InputJsonValue; reason?: string }) {
  return db.auditEvent.create({ data: { actorType: "USER", actorId: event.actorId, action: event.action, entityType: event.entityType, entityId: event.entityId, beforeJson: event.beforeJson, afterJson: event.afterJson, reason: event.reason, requestId: event.requestId, workstation: event.workstation } });
}
