import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

/** Public source metadata only; never includes credentials or run evidence. */
export function sourceManifest(root = process.cwd()) {
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
  const manifest: {
    path: string;
    encoding: "canonical-json" | "raw";
    bytes: number;
    sha256: string;
  }[] = [];
  for (const file of files.sort()) {
    const raw = readFileSync(join(root, file));
    // Vercel rewrites this config's formatting and adds name/version defaults.
    // Those fields are explicit in source; hash every semantic value, including
    // unknown keys, while preserving array order. All other files remain raw.
    const encoding = file === "vercel.json" ? "canonical-json" : "raw";
    const bytes =
      encoding === "canonical-json"
        ? Buffer.from(canonicalJson(JSON.parse(raw.toString("utf8"))))
        : raw;
    hash.update(file + "\0" + bytes.length + "\0");
    hash.update(bytes);
    manifest.push({
      path: file,
      encoding,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return { digest: hash.digest("hex"), files: manifest };
}

/** Stable checksum of uploaded executable source; excludes secrets and run evidence. */
export function sourceDigest(root = process.cwd()) {
  return sourceManifest(root).digest;
}
