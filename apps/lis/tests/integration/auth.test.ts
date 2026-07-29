import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/server/db/client";
import { authenticateUser, createDemoUser } from "@/modules/auth/service";

const prisma = createPrismaClient(
  "postgresql://kiro@127.0.0.1:5432/questcare_lis_test?schema=public",
);

describe("authentication", () => {
  beforeAll(async () => {
    await prisma.session.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.upsert({
      where: { code: "ADMINISTRATOR" },
      update: {},
      create: { code: "ADMINISTRATOR", name: "Administrator" },
    });
    await createDemoUser(prisma, {
      username: "admin",
      displayName: "Demo Administrator",
      password: "Admin123!Quest",
      roleCode: "ADMINISTRATOR",
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a principal for correct credentials", async () => {
    const principal = await authenticateUser(prisma, "admin", "Admin123!Quest");

    expect(principal?.roles).toEqual(["ADMINISTRATOR"]);
  });

  it("rejects an incorrect password", async () => {
    const principal = await authenticateUser(prisma, "admin", "wrong-password");

    expect(principal).toBeNull();
  });
});
