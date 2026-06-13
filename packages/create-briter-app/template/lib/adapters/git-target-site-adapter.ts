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
    case "archive":
      return "archive post";
    case "unarchive":
      return "unarchive post";
  }
}

export const gitTargetSiteAdapter: SiteAdapter = {
  key: "git-target",
  label: "External Git Target",
  contentExtension: ".mdx",
  publicReader: "external",
  getEditorHref(slug) {
    return `/write/${slug}`;
  },
  getPreviewHref(slug) {
    return `/preview/${slug}`;
  },
  getPublishedHref(slug) {
    return `/posts/${slug}`;
  },
  getRevalidatePaths() {
    return [];
  },
  getAllowedPaths() {
    return [/^content\//, /^public\/uploads\//];
  },
  buildCommitMessage(action: PostAction, post: PostDocument) {
    return `briter: ${describeAction(action)} "${post.frontmatter.title}"`;
  },
};
