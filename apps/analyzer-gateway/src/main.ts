import { createGateway } from "./core/gateway.js";

const gateway = createGateway();

await gateway.start();
console.log("Questcare analyzer gateway started", gateway.health());

async function shutdown() {
  await gateway.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
