import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/server/db/client";

const databaseUrl =
  "postgresql://kiro@127.0.0.1:5432/questcare_lis_test?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("MVP database schema", () => {
  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    await prisma.reportSnapshot.deleteMany();
    await prisma.resultRevision.deleteMany();
    await prisma.result.deleteMany();
    await prisma.orderTest.deleteMany();
    await prisma.specimen.deleteMany();
    await prisma.resultSet.deleteMany();
    await prisma.labOrder.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores a patient using a unique medical record number", async () => {
    const patient = await prisma.patient.create({
      data: {
        medicalRecordNumber: "MRN000001",
        firstName: "Maya",
        lastName: "Santos",
        birthDate: new Date("1992-04-18"),
        sex: "FEMALE",
      },
    });

    expect(patient.medicalRecordNumber).toBe("MRN000001");
  });
});
