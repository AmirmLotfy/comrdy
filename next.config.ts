import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
let buildProvenance = JSON.stringify({
  revision: null,
  dirty: true,
  builtAt: null,
});
try {
  buildProvenance = readFileSync(".build-provenance.json", "utf8");
} catch {}
const config: NextConfig = {
  poweredByHeader: false,
  env: { COMRDY_BUILD_PROVENANCE: buildProvenance },
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
export default config;
