import type { MetadataRoute } from "next";

import { getSiteIdentity } from "@/lib/public/site-identity";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getSiteIdentity();
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${site.baseUrl}/sitemap.xml`,
  };
}
