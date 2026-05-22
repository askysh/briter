import type { MetadataRoute } from "next";

import { createAppServices } from "@/lib/app/services";
import { getSiteIdentity } from "@/lib/public/site-identity";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ repository }, site] = await Promise.all([
    createAppServices(),
    getSiteIdentity(),
  ]);
  const posts = (await repository.listPosts()).filter((p) => p.status === "published");

  return [
    { url: `${site.baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site.baseUrl}/posts`, changeFrequency: "daily", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${site.baseUrl}/posts/${post.slug}`,
      lastModified: post.frontmatter.publishedAt
        ? new Date(post.frontmatter.publishedAt)
        : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
