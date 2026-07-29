export type RoleCode =
  | "ADMINISTRATOR"
  | "REGISTRATION"
  | "LABORATORY_USER"
  | "VALIDATOR";

export type Permission =
  | "user:manage"
  | "patient:create"
  | "patient:view"
  | "patient:edit"
  | "order:create"
  | "order:view"
  | "order:cancel"
  | "result:enter"
  | "result:submit"
  | "result:validate"
  | "result:release"
  | "report:view"
  | "audit:view"
  | "analyzer:view"
  | "analyzer:reconcile";

const allPermissions: Permission[] = [
  "user:manage",
  "patient:create",
  "patient:view",
  "patient:edit",
  "order:create",
  "order:view",
  "order:cancel",
  "result:enter",
  "result:submit",
  "result:validate",
  "result:release",
  "report:view",
  "audit:view",
  "analyzer:view",
  "analyzer:reconcile",
];

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  ADMINISTRATOR: allPermissions,
  REGISTRATION: [
    "patient:create",
    "patient:view",
    "patient:edit",
    "order:create",
    "order:view",
    "order:cancel",
    "report:view",
  ],
  LABORATORY_USER: [
    "patient:view",
    "order:create",
    "order:view",
    "order:cancel",
    "result:enter",
    "result:submit",
    "report:view",
    "analyzer:view",
  ],
  VALIDATOR: [
    "patient:view",
    "order:view",
    "order:cancel",
    "result:validate",
    "result:release",
    "report:view",
    "audit:view",
    "analyzer:view",
    "analyzer:reconcile",
  ],
};

export function permissionsForRoles(roles: RoleCode[]) {
  return new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]));
}

export function can(permissions: Set<Permission>, permission: Permission) {
  return permissions.has(permission);
}
