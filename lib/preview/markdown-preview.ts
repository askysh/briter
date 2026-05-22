import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import {
  countWords,
  estimateReadingTimeMinutes,
} from "@/lib/content/post-document";

export async function renderMarkdownPreview(markdown: string) {
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(markdown),
  );

  return {
    html,
    wordCount: countWords(markdown),
    readingTimeMinutes: estimateReadingTimeMinutes(markdown),
  };
}
