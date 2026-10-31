import nextEnv from "@next/env";
import { setTimeout as pause } from "node:timers/promises";
nextEnv.loadEnvConfig(process.cwd());
const { processSandboxJobs } = await import("./sandbox");
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
  });
if (process.env.APP_MODE !== "sandbox") {
  console.log("Worker idle: simulation executes without provider jobs.");
  process.exit(0);
}
while (!stopping) {
  try {
    const result = await processSandboxJobs();
    if (!result.processed) await pause(1000);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Worker failed");
    await pause(5000);
  }
}
const state = globalThis as typeof globalThis & {
  comrdySql?: { end: () => Promise<void> };
};
await state.comrdySql?.end();
