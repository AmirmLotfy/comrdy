import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Stable checksum of uploaded executable source; excludes secrets and run evidence. */
export function sourceDigest(root = process.cwd()) {
  const files: string[] = [];
  function walk(relative: string) {
    if (!existsSync(join(root, relative))) return;
    for (const entry of readdirSync(join(root, relative), {
      withFileTypes: true,
    })) {
      const path = relative + "/" + entry.name;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
      else throw new Error("Release source cannot contain symbolic links.");
    }
  }
  for (const directory of [
    "src",
    "scripts",
    "public/brand",
    "public/verification",
  ])
    walk(directory);
  for (const file of [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "vercel.json",
  ])
    if (existsSync(join(root, file))) files.push(file);
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    const bytes = readFileSync(join(root, file));
    hash.update(file + "\0" + bytes.length + "\0");
    hash.update(bytes);
  }
  return hash.digest("hex");
}
