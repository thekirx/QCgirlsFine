export type DependencyState = "up" | "down";

export function getHealthSnapshot(input: {
  database: DependencyState;
  gateway: DependencyState;
}) {
  return {
    status: input.database === "up" ? "available" : "unavailable",
    database: input.database,
    gateway: input.gateway,
    coreWorkflowAvailable: input.database === "up",
  } as const;
}
