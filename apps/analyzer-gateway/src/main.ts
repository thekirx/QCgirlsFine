import { createGateway } from "./core/gateway.js";
import { FileSpoolStore } from "./storage/file-store.js";
import { simulateResult } from "./adapters/simulator/adapter.js";
import { deliverEnvelope } from "./delivery/lis-client.js";

const gateway = createGateway();

await gateway.start();
console.log("Questcare analyzer gateway started", gateway.health());
const baseUrl=process.env.LIS_BASE_URL??"http://127.0.0.1:3000";const token=process.env.GATEWAY_TOKEN??"questcare-mvp-local-gateway-secret-change-me";const spool=new FileSpoolStore(process.env.GATEWAY_SPOOL_DIR??"runtime-data/gateway/spool");
const accession=process.env.SIM_ACCESSION;
if(accession){const envelope=simulateResult(accession,process.env.SIM_TEST_CODE??"GLU",process.env.SIM_VALUE??"99");await spool.put(envelope.gatewayMessageId,envelope);try{await deliverEnvelope(baseUrl,token,envelope);await spool.complete(envelope.gatewayMessageId);console.log("Simulator result delivered",{messageId:envelope.gatewayMessageId,accession})}catch(error){console.error("Simulator delivery retained in spool",{messageId:envelope.gatewayMessageId,error:error instanceof Error?error.message:"unknown"})}}
const heartbeat=setInterval(async()=>{try{await fetch(`${baseUrl}/api/gateway/v1/health`,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({schemaVersion:"1.0",gatewayId:"gateway-dev",gatewayVersion:"1.0.0",occurredAt:new Date().toISOString(),connections:[{connectionId:"SIM-01",status:"ONLINE",lastSuccessfulMessageAt:null,errorCode:null}]})})}catch{}},30_000);

async function shutdown() {
  clearInterval(heartbeat);
  await gateway.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
