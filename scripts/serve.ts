import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const runtimeEnv = { ...process.env, NODE_ENV: "production" as const };
import { spawn } from "node:child_process";
const children = [
  spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"],
    { stdio: "inherit", env: runtimeEnv },
  ),
  ...(process.env.APP_MODE === "sandbox"
    ? [
        spawn(process.execPath, ["--import", "tsx", "src/server/worker.ts"], {
          stdio: "inherit",
          env: runtimeEnv,
        }),
      ]
    : []),
];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 5000).unref();
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => stop(0));
for (const child of children) child.on("exit", (code) => stop(code ?? 1));
