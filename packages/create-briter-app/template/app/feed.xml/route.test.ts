/**
 * Tests for the RSS feed route's escapeXml helper and XML assembly logic.
 * The route itself is an integration point (requires DB + runtime config), so
 * we test the XML-escape invariants and structure with a local re-implementation
 * of the same escapeXml function that the route uses.
 */
import { describe, expect, test } from "bun:test";

// Replicate the escapeXml helper from the route module (it is not exported,
// but the behaviour is contractual — any change that breaks these tests is
// a regression in the feed output).
function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

describe("escapeXml (RSS feed helper)", () => {
  test("passes plain text through unchanged", () => {
    expect(escapeXml("Hello world")).toBe("Hello world");
  });

  test("escapes all five XML special characters", () => {
    expect(escapeXml("&")).toBe("&amp;");
    expect(escapeXml("<")).toBe("&lt;");
    expect(escapeXml(">")).toBe("&gt;");
    expect(escapeXml('"')).toBe("&quot;");
    expect(escapeXml("'")).toBe("&apos;");
  });

  test("escapes a realistic post title with mixed characters", () => {
    const title = `Rob's "best" post <ever> & more`;
    const escaped = escapeXml(title);
    expect(escaped).toBe(
      "Rob&apos;s &quot;best&quot; post &lt;ever&gt; &amp; more",
    );
    // The escaped string must not contain bare XML special chars
    expect(escaped).not.toMatch(/[<>"'&](?!(amp|lt|gt|quot|apos);)/);
  });

  test("escapes multiple occurrences of the same character", () => {
    expect(escapeXml("a & b & c")).toBe("a &amp; b &amp; c");
  });

  test("handles empty string", () => {
    expect(escapeXml("")).toBe("");
  });
});

describe("RSS feed XML structure", () => {
  // Construct the same XML template the route builds to verify structural integrity
  function buildFeedXml(
    siteName: string,
    baseUrl: string,
    description: string,
    posts: Array<{ title: string; slug: string; publishedAt: string; summary: string }>,
  ) {
    const items = posts
      .map((post) => {
        const link = `${baseUrl}/posts/${post.slug}`;
        return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><description>${escapeXml(post.summary)}</description></item>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(siteName)}</title><link>${escapeXml(baseUrl)}</link><description>${escapeXml(description)}</description>${items}</channel></rss>`;
  }

  test("produces valid RSS 2.0 structure for a single post", () => {
    const xml = buildFeedXml(
      "My Blog",
      "https://example.com",
      "A blog about things",
      [{ title: "Hello", slug: "hello", publishedAt: "2026-01-01T00:00:00Z", summary: "An intro" }],
    );
    expect(xml).toStartWith('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain("<title>My Blog</title>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>Hello</title>");
    expect(xml).toContain("https://example.com/posts/hello");
  });

  test("produces empty channel items when there are no published posts", () => {
    const xml = buildFeedXml("Empty Blog", "https://example.com", "Nothing yet", []);
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });

  test("special characters in post title are safely escaped in output", () => {
    const xml = buildFeedXml(
      "Blog",
      "https://example.com",
      "desc",
      [{ title: "Rock & Roll <loud>", slug: "rock", publishedAt: "2026-01-01T00:00:00Z", summary: "loud" }],
    );
    expect(xml).toContain("Rock &amp; Roll &lt;loud&gt;");
    // The raw characters should not appear in the XML output
    expect(xml).not.toContain("Rock & Roll");
    expect(xml).not.toContain("<loud>");
  });
});
