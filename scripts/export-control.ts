import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  exportControlReceipt,
  validateControlRecord,
} from "../src/core/control";

// Offline, explicit export only. No environment loading or provider calls.
const [reviewed, input, output, extra] = process.argv.slice(2);
if (reviewed !== "--reviewed" || !input || !output || extra)
  throw new Error(
    "Usage: npx tsx scripts/export-control.ts --reviewed PRIVATE_CONTROL_JSON REVIEWED_OUTPUT_JSON. This exports a completed redacted receipt only; review before publication.",
  );
const source = resolve(input),
  destination = resolve(output);
if (source === destination)
  throw new Error("Export cannot overwrite the private control record");
const record: unknown = JSON.parse(await readFile(source, "utf8"));
validateControlRecord(record);
const receipt = exportControlReceipt(record, new Date().toISOString());
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(receipt, null, 2) + "\n", {
  flag: "wx",
  mode: 0o600,
});
console.log(
  JSON.stringify({
    status: "redacted-control-exported",
    id: receipt.id,
    revision: receipt.executionRevision,
    output: destination,
    hash: receipt.hash,
  }),
);
