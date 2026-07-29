export function createGateway() {
  let running = false;

  return {
    async start() {
      running = true;
    },
    async stop() {
      running = false;
    },
    health() {
      return {
        status: running ? "online" : "offline",
        adapter: "simulator",
      } as const;
    },
  };
}
