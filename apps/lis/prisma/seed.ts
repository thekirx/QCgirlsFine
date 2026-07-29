import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ValueType } from "@prisma/client";

import { createDemoUser } from "../src/modules/auth/service";
import { ROLE_PERMISSIONS, type Permission, type RoleCode } from "../src/modules/auth/policy";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const roleNames: Record<RoleCode, string> = { ADMINISTRATOR: "Administrator", REGISTRATION: "Registration", LABORATORY_USER: "Laboratory User", VALIDATOR: "Validator" };
const users = [
  { username: "admin", displayName: "System Administrator", password: "Admin123!Quest", roleCode: "ADMINISTRATOR" as const },
  { username: "registration", displayName: "Registration Demo", password: "Register123!", roleCode: "REGISTRATION" as const },
  { username: "laboratory", displayName: "Laboratory Demo", password: "Laboratory123!", roleCode: "LABORATORY_USER" as const },
  { username: "validator", displayName: "Validator Demo", password: "Validator123!", roleCode: "VALIDATOR" as const },
];
const catalog = [
  { code: "GLU", name: "Glucose", section: "Clinical Chemistry", valueType: ValueType.NUMERIC, unit: "mg/dL", decimalPlaces: 1, low: 70, high: 110 },
  { code: "CREA", name: "Creatinine", section: "Clinical Chemistry", valueType: ValueType.NUMERIC, unit: "mg/dL", decimalPlaces: 2, low: 0.6, high: 1.3 },
  { code: "HGB", name: "Hemoglobin", section: "Hematology", valueType: ValueType.NUMERIC, unit: "g/dL", decimalPlaces: 1, low: 12, high: 17.5 },
  { code: "WBC", name: "White Blood Cell Count", section: "Hematology", valueType: ValueType.NUMERIC, unit: "10^9/L", decimalPlaces: 1, low: 4, high: 11 },
  { code: "PLT", name: "Platelet Count", section: "Hematology", valueType: ValueType.NUMERIC, unit: "10^9/L", decimalPlaces: 0, low: 150, high: 450 },
];

async function main() {
  const permissions = [...new Set(Object.values(ROLE_PERMISSIONS).flat())] as Permission[];
  for (const code of permissions) await prisma.permission.upsert({ where: { code }, update: {}, create: { code, description: code } });
  for (const [code, name] of Object.entries(roleNames) as [RoleCode, string][]) {
    const role = await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = await prisma.permission.findMany({ where: { code: { in: ROLE_PERMISSIONS[code] } } });
    await prisma.rolePermission.createMany({ data: rows.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
  }
  for (const user of users) await createDemoUser(prisma, user);
  for (const item of catalog) {
    const { low, high, ...definition } = item;
    const test = await prisma.testDefinition.upsert({ where: { code: item.code }, update: { ...definition, active: true }, create: definition });
    await prisma.referenceRange.deleteMany({ where: { testDefinitionId: test.id } });
    await prisma.referenceRange.create({ data: { testDefinitionId: test.id, low, high } });
  }
  await prisma.analyzerConnection.upsert({ where: { code: "SIM-01" }, update: { name: "Development Analyzer Simulator", adapterType: "SIMULATOR" }, create: { code: "SIM-01", name: "Development Analyzer Simulator", adapterType: "SIMULATOR" } });
  process.stdout.write(`Seeded ${users.length} demo users and ${catalog.length} tests.\n`);
}
main().finally(() => prisma.$disconnect());
