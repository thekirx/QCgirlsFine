import { describe, expect, it } from "vitest";

import { can, permissionsForRoles } from "./policy";

describe("MVP permission policy", () => {
  it("allows Registration to create patients but not validate results", () => {
    const permissions = permissionsForRoles(["REGISTRATION"]);

    expect(can(permissions, "patient:create")).toBe(true);
    expect(can(permissions, "result:validate")).toBe(false);
  });

  it("allows Validator to validate and release but not manage users", () => {
    const permissions = permissionsForRoles(["VALIDATOR"]);

    expect(can(permissions, "result:validate")).toBe(true);
    expect(can(permissions, "result:release")).toBe(true);
    expect(can(permissions, "user:manage")).toBe(false);
  });

  it("allows Administrator every MVP permission", () => {
    const permissions = permissionsForRoles(["ADMINISTRATOR"]);

    expect(can(permissions, "user:manage")).toBe(true);
    expect(can(permissions, "result:release")).toBe(true);
    expect(can(permissions, "analyzer:reconcile")).toBe(true);
  });
});
