import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function releaseLibrary() {
  try {
    const value = JSON.parse(
      await readFile(resolve("public/release/evidence.json"), "utf8"),
    );
    if (!Array.isArray(value.runs)) throw new Error("Invalid release library");
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { runs: [], revision: null };
    throw error;
  }
}
