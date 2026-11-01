import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://127.0.0.1:3000");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/cases/", "/readiness/run", "/store?", "/compare?"],
    },
    sitemap: new URL("/sitemap.xml", origin).href,
  };
}
