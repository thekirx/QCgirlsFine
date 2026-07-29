import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/client";
import { createPatient, searchPatients } from "@/modules/patients/service";
import { createOrder, getWorkQueue } from "@/modules/orders/service";
import { saveManualResults, submitForValidation, validateResultSet, releaseResultSet } from "@/modules/results/service";

const prisma = createPrismaClient("postgresql://kiro@127.0.0.1:5432/questcare_lis_test?schema=public");
const actor = { actorId: "test-user", requestId: "workflow-test" };

describe("complete clinical workflow", () => {
  beforeAll(async () => {
    await prisma.reportSnapshot.deleteMany(); await prisma.resultRevision.deleteMany(); await prisma.result.deleteMany();
    await prisma.orderTest.deleteMany(); await prisma.specimen.deleteMany(); await prisma.resultSet.deleteMany(); await prisma.labOrder.deleteMany();
    await prisma.accessionCounter.deleteMany(); await prisma.auditEvent.deleteMany(); await prisma.patient.deleteMany(); await prisma.referenceRange.deleteMany(); await prisma.testDefinition.deleteMany();
    const glucose = await prisma.testDefinition.create({ data: { code: "GLU", name: "Glucose", section: "Clinical Chemistry", valueType: "NUMERIC", unit: "mg/dL", decimalPlaces: 1 } });
    await prisma.referenceRange.create({ data: { testDefinitionId: glucose.id, low: 70, high: 110 } });
  });
  afterAll(() => prisma.$disconnect());

  it("moves a patient order from registration to immutable released PDF with audit history", async () => {
    const patient = await createPatient(prisma, { medicalRecordNumber: "QC-000001", firstName: "Maya", middleName: "Reyes", lastName: "Santos", birthDate: "1992-04-18", sex: "FEMALE", phone: "09171234567", address: "Quezon City" }, actor);
    expect((await searchPatients(prisma, "Maya"))[0]?.id).toBe(patient.id);

    const definition = await prisma.testDefinition.findUniqueOrThrow({ where: { code: "GLU" } });
    const order = await createOrder(prisma, { patientId: patient.id, priority: "ROUTINE", requestingPhysician: "Dr. Ana Cruz", source: "Walk-in", clinicalNotes: "Fasting", testDefinitionIds: [definition.id] }, actor);
    expect(order.accessionNumber).toMatch(/^QC\d{8}-\d{4}$/);
    expect((await getWorkQueue(prisma, {}))[0]?.accessionNumber).toBe(order.accessionNumber);

    const orderTest = order.tests[0];
    await expect(releaseResultSet(prisma, order.resultSet!.id, actor)).rejects.toThrow("not validated");
    await saveManualResults(prisma, order.resultSet!.id, [{ orderTestId: orderTest.id, value: "126" }], actor);
    await submitForValidation(prisma, order.resultSet!.id, actor);
    await validateResultSet(prisma, order.resultSet!.id, actor);
    const released = await releaseResultSet(prisma, order.resultSet!.id, actor);

    expect(released.order.status).toBe("RELEASED");
    expect(Buffer.from(released.report.bytes).subarray(0, 4).toString()).toBe("%PDF");
    expect(released.report.bytes.length).toBeGreaterThan(1000);
    expect(released.report.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await prisma.reportSnapshot.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.auditEvent.findMany({ where: { entityId: { in: [patient.id, order.id, order.resultSet!.id] } } })).map((event) => event.action)).toEqual(expect.arrayContaining(["PATIENT_CREATED", "ORDER_CREATED", "RESULTS_SAVED", "RESULTS_SUBMITTED", "RESULTS_VALIDATED", "RESULTS_RELEASED"]));
  });
});
