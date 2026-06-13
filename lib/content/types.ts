export type PostStatus = "draft" | "scheduled" | "published" | "archived";

export type PostFrontmatter = {
  title: string;
  summary: string;
  draft: boolean;
  publishedAt?: string;
  tags: string[];
  // Archiving keeps the .mdx file on disk but flags it so the public site
  // hides it. Reversible: clearing the flag restores the post. Absent on
  // posts that have never been archived.
  archived?: boolean;
};

export type PostDocument = {
  slug: string;
  filePath: string;
  body: string;
  frontmatter: PostFrontmatter;
  status: PostStatus;
  readingTimeMinutes: number;
  wordCount: number;
};

export type PostInput = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  draft: boolean;
  publishedAt?: string;
  archived?: boolean;
};

export type PostAction =
  | "save-draft"
  | "schedule"
  | "publish"
  | "archive"
  | "unarchive";
