import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

function loadBuildProvenance(phase: string) {
  let buildProvenance = JSON.stringify({
    revision: null,
    dirty: true,
    builtAt: null,
  });
  try {
    buildProvenance = readFileSync(".build-provenance.json", "utf8");
  } catch {}
  if (phase === PHASE_PRODUCTION_BUILD) {
    const value = JSON.parse(buildProvenance);
    if (
      !/^[a-f0-9]{40}$/.test(value.revision ?? "") ||
      typeof value.dirty !== "boolean" ||
      !Number.isFinite(Date.parse(value.builtAt)) ||
      !/^[a-f0-9]{64}$/.test(value.sourceDigest ?? "") ||
      (process.env.VERCEL === "1" && value.dirty)
    )
      throw new Error(
        "Next build requires valid build provenance; run npm run build.",
      );
    console.log("COMRDY Next build provenance", JSON.stringify(value));
  }
  return buildProvenance;
}
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
// Read when Next requests the phase, after the provenance command has run.
// A platform may inspect/import config before invoking the build command.
export default function nextConfig(phase: string): NextConfig {
  return {
    ...config,
    env: { COMRDY_BUILD_PROVENANCE: loadBuildProvenance(phase) },
  };
}
