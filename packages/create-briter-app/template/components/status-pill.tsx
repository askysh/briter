import type { PostStatus } from "@/lib/content/types";

export function StatusPill({ status }: { status: PostStatus }) {
  return (
    <span className={`status-pill status-${status}`}>
      {status.replace("-", " ")}
    </span>
  );
}
