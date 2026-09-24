import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/creator", "/feed", "/bundles", "/faq", "/terms", "/privacy", "/dmca", "/guidelines"],
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/messages",
        "/purchases",
        "/payment-history",
        "/payment/",
        "/settings",
        "/saved",
        "/notifications",
        "/subscribe",
        "/pay/",
        "/creator/dashboard",
        "/creator/vault",
        "/post/",
        "/auth/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
