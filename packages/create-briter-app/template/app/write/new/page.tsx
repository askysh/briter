export const dynamic = "force-dynamic";

import { PostEditor } from "@/components/post-editor";

const emptyPost = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  tags: [],
  draft: true,
};

export default function NewPostPage() {
  return <PostEditor initialPost={emptyPost} />;
}
