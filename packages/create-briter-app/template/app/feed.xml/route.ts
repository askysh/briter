import { createAppServices } from "@/lib/app/services";
import { getSiteIdentity } from "@/lib/public/site-identity";

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const [{ repository }, site] = await Promise.all([
    createAppServices(),
    getSiteIdentity(),
  ]);
  const posts = (await repository.listPosts()).filter((p) => p.status === "published");

  const items = posts
    .map((post) => {
      const link = `${site.baseUrl}/posts/${post.slug}`;
      return `<item><title>${escapeXml(post.frontmatter.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid><pubDate>${new Date(post.frontmatter.publishedAt ?? Date.now()).toUTCString()}</pubDate><description>${escapeXml(post.frontmatter.summary)}</description></item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(site.name)}</title><link>${escapeXml(site.baseUrl)}</link><description>${escapeXml(site.description)}</description>${items}</channel></rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
