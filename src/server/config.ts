import { executionProvenance } from "./provenance";
export function status() {
  if (
    process.env.APP_MODE &&
    !["simulation", "sandbox"].includes(process.env.APP_MODE)
  )
    throw new Error("APP_MODE must explicitly be simulation or sandbox.");
  const ready = {
    database: !!process.env.DATABASE_URL,
    openai: !!process.env.OPENAI_API_KEY,
    paypal:
      !!process.env.PAYPAL_CLIENT_ID &&
      !!process.env.PAYPAL_CLIENT_SECRET &&
      !!process.env.PAYPAL_WEBHOOK_ID &&
      !!process.env.PAYPAL_MERCHANT_ID,
    kernel:
      !!process.env.KERNEL_API_KEY ||
      (process.env.BROWSER_DRIVER === "local" &&
        process.env.NODE_ENV !== "production"),
  };
  return {
    mode: process.env.APP_MODE === "sandbox" ? "sandbox" : "simulation",
    execution: executionProvenance(),
    ready,
    liveReady: Object.values(ready).every(Boolean),
    spendingLimitUSD: 100,
    storageReady: !process.env.VERCEL || ready.database,
    accessCodeRequired: process.env.APP_MODE === "sandbox",
  };
}
export function requireSandbox() {
  const s = status();
  if (
    s.mode !== "sandbox" ||
    !s.liveReady ||
    process.env.PAYPAL_ENV !== "sandbox" ||
    !process.env.RUN_ACCESS_CODE
  )
    throw new Error(
      "Sandbox configuration incomplete. No provider action was attempted.",
    );
}
