import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/creator`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/bundles`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/dmca`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/guidelines`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
