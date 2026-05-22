import type { PostAction, PostDocument } from "@/lib/content/types";

export type SiteAdapter = {
  key: string;
  label: string;
  contentExtension: ".md" | ".mdx";
  getEditorHref(slug: string): string;
  getPreviewHref(slug: string): string;
  getPublishedHref(slug: string): string;
  getRevalidatePaths(slug: string): string[];
  buildCommitMessage(action: PostAction, post: PostDocument): string;
};
