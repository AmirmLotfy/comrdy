import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://127.0.0.1:3000");
  return ["", "/readiness", "/judges", "/store", "/docs"].map((path) => ({
    url: new URL(path || "/", origin).href,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
