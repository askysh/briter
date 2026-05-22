import type { SiteAdapter } from "@/lib/adapters/site-adapter";
import type { PostAction, PostDocument } from "@/lib/content/types";

function describeAction(action: PostAction) {
  switch (action) {
    case "save-draft":
      return "save draft";
    case "schedule":
      return "schedule post";
    case "publish":
      return "publish post";
  }
}

export const localMdxSiteAdapter: SiteAdapter = {
  key: "local-mdx",
  label: "Local MDX Site",
  contentExtension: ".mdx",
  getEditorHref(slug) {
    return `/write/${slug}`;
  },
  getPreviewHref(slug) {
    return `/preview/${slug}`;
  },
  getPublishedHref(slug) {
    return `/posts/${slug}`;
  },
  getRevalidatePaths(slug) {
    return ["/", `/write/${slug}`, `/preview/${slug}`, `/posts/${slug}`];
  },
  buildCommitMessage(action: PostAction, post: PostDocument) {
    return `briter: ${describeAction(action)} "${post.frontmatter.title}"`;
  },
};
