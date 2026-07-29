import { hash, verify } from "argon2";
import type { PrismaClient } from "@prisma/client";

import type { RoleCode } from "./policy";

type DemoUserInput = {
  username: string;
  displayName: string;
  password: string;
  roleCode: RoleCode;
};

export async function createDemoUser(
  prisma: PrismaClient,
  input: DemoUserInput,
) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { code: input.roleCode },
  });
  const passwordHash = await hash(input.password, { type: 2 });

  return prisma.user.upsert({
    where: { username: input.username },
    update: {
      displayName: input.displayName,
      passwordHash,
      active: true,
      roles: {
        deleteMany: {},
        create: { roleId: role.id },
      },
    },
    create: {
      username: input.username,
      displayName: input.displayName,
      passwordHash,
      roles: { create: { roleId: role.id } },
    },
  });
}

export async function authenticateUser(
  prisma: PrismaClient,
  username: string,
  password: string,
) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { roles: { include: { role: true } } },
  });

  if (!user?.active || (user.lockedUntil && user.lockedUntil > new Date())) {
    return null;
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    const failedAttempts = user.failedAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: failedAttempts >= 5 ? 0 : failedAttempts,
        lockedUntil:
          failedAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000)
            : undefined,
      },
    });
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roles: user.roles.map(({ role }) => role.code as RoleCode),
  };
}
