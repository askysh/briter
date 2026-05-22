export type PostStatus = "draft" | "scheduled" | "published";

export type PostFrontmatter = {
  title: string;
  summary: string;
  draft: boolean;
  publishedAt?: string;
  tags: string[];
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
};

export type PostAction = "save-draft" | "schedule" | "publish";
