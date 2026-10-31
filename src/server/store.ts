import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
export interface Database {
  contracts: Record<
    string,
    { owner: string; contract: unknown; compiler?: unknown }
  >;
  runs: Record<string, StoredRun>;
  webhooks: Record<string, boolean>;
  quotas?: Record<string, number>;
  compilations?: Record<string, unknown>;
}
export interface StoredRun {
  id: string;
  owner: string;
  mode: "simulation" | "sandbox";
  fault: "none" | "variant" | "shipping";
  status: string;
  contract: any;
  snapshots: Snapshot[];
  events: { time: string; title: string; detail: string }[];
  decision: { verdict: string; reason: string };
  payment: {
    authorizationId: string | null;
    captureId: string | null;
    status: string;
    orderId?: string;
    approvalUrl?: string;
  };
  parentId?: string;
  operations: Record<string, string>;
  createdAt: string;
  [key: string]: unknown;
}
export interface Snapshot {
  checkpoint: string;
  size: string;
  totalMinor: number;
  revision: number;
  source: string;
}
const empty = (): Database => ({ contracts: {}, runs: {}, webhooks: {} });
const globalStore = globalThis as typeof globalThis & {
  comrdyLock?: Promise<unknown>;
  comrdySql?: ReturnType<typeof postgres>;
};
function sqlClient() {
  return (globalStore.comrdySql ??= postgres(process.env.DATABASE_URL!, {
    max: 4,
  }));
}
export async function transaction<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  if (process.env.DATABASE_URL) {
    const sql = sqlClient();
    return (await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(743281)`;
      const rows =
        await tx`SELECT payload FROM comrdy_state WHERE key='main' FOR UPDATE`;
      const db = (rows[0]?.payload as Database | undefined) ?? empty();
      const result = await fn(db);
      await tx`INSERT INTO comrdy_state (key,payload) VALUES ('main',${tx.json(db as never)}) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated_at=now()`;
      return result;
    })) as T;
  }
  if (process.env.APP_MODE === "sandbox")
    throw new Error("Sandbox requires PostgreSQL durability");
  const previous = globalStore.comrdyLock ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const dir = resolve(".data");
      await mkdir(dir, { recursive: true });
      const file = resolve(dir, "simulation.json");
      let db: Database;
      try {
        db = JSON.parse(await readFile(file, "utf8"));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        db = empty();
      }
      const result = await fn(db);
      const tmp = file + ".tmp";
      await writeFile(tmp, JSON.stringify(db), { mode: 0o600 });
      await rename(tmp, file);
      return result;
    });
  globalStore.comrdyLock = next;
  return next;
}
export function publicRun(run: StoredRun) {
  return {
    id: run.id,
    mode: run.mode,
    fault: run.fault,
    status: run.status,
    contract: run.contract,
    snapshots: run.snapshots,
    events: run.events,
    decision: run.decision,
    payment: run.payment,
    createdAt: run.createdAt,
    ...(run.parentId ? { parentId: run.parentId } : {}),
    ...(run.evaluations ? { evaluations: run.evaluations } : {}),
    ...(run.evidence ? { evidence: run.evidence } : {}),
    ...(run.compiler ? { compiler: run.compiler } : {}),
    ...(run.merchantOrder ? { merchantOrder: run.merchantOrder } : {}),
  };
}
export async function claimQuota(kind: "compile" | "run") {
  return transaction((db) => {
    const day = new Date().toISOString().slice(0, 10);
    const key = day + ":" + kind;
    db.quotas ??= {};
    const limit = kind === "compile" ? 50 : 20;
    if ((db.quotas[key] ?? 0) >= limit)
      throw new Error(
        "Daily demo execution limit reached. Saved evidence remains available.",
      );
    db.quotas[key] = (db.quotas[key] ?? 0) + 1;
  });
}
