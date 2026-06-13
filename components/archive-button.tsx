"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Archiving keeps the .mdx on disk and flips a frontmatter flag so the public
// site hides the post; un-archiving restores it. Reversible, never a delete.
export function ArchiveButton({
  slug,
  archived,
}: {
  slug: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/posts/${encodeURIComponent(slug)}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: !archived }),
        },
      );
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="button button-ghost"
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
    >
      {busy
        ? archived
          ? "Restoring…"
          : "Archiving…"
        : archived
          ? "Unarchive"
          : "Archive"}
    </button>
  );
}
