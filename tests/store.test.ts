import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { transaction } from "../src/server/store";
const url = process.env.TEST_DATABASE_URL;
test(
  "PostgreSQL transactions serialize concurrent worker processes and survive reconnect",
  { skip: !url },
  async () => {
    process.env.DATABASE_URL = url;
    const key = "test-" + randomUUID();
    await transaction((db) => {
      db.quotas ??= {};
      db.quotas[key] = 0;
    });
    const code = `import {transaction} from './src/server/store.ts'; for(let i=0;i<10;i++)await transaction(db=>{db.quotas['${key}']++;});process.exit(0);`;
    const child = () =>
      new Promise<void>((resolve, reject) => {
        const p = spawn(
          process.execPath,
          ["--import", "tsx", "--input-type=module", "-e", code],
          {
            cwd: process.cwd(),
            env: { ...process.env, DATABASE_URL: url },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let stderr = "";
        p.stderr.on("data", (d) => (stderr += d));
        p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(stderr))));
      });
    await Promise.all([child(), child(), child()]);
    const count = await transaction((db) => db.quotas?.[key]);
    assert.equal(count, 30);
    const inspector = postgres(url!, { max: 1 });
    try {
      const [before] =
        await inspector`SELECT xmin::text AS version FROM comrdy_state WHERE key='main'`;
      await transaction((db) => db.quotas?.[key]);
      const [after] =
        await inspector`SELECT xmin::text AS version FROM comrdy_state WHERE key='main'`;
      assert.equal(
        after!.version,
        before!.version,
        "Read-only polls must not create a new PostgreSQL row version",
      );
    } finally {
      await inspector.end();
    }
    await transaction((db) => {
      delete db.quotas![key];
    });
    const state = globalThis as typeof globalThis & {
      comrdySql?: { end: () => Promise<void> };
    };
    await state.comrdySql?.end();
    delete state.comrdySql;
  },
);
