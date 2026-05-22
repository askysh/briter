import type { PostAction, PostDocument } from "@/lib/content/types";

export type SiteAdapter = {
  key: string;
  label: string;
  contentExtension: ".md" | ".mdx";
  publicReader: "self" | "external" | "off";
  getEditorHref(slug: string): string;
  getPreviewHref(slug: string): string;
  getPublishedHref(slug: string): string;
  getRevalidatePaths(slug: string): string[];
  getAllowedPaths(): RegExp[];
  buildCommitMessage(action: PostAction, post: PostDocument): string;
};
