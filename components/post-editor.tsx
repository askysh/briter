"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { slugify } from "@/lib/content/post-document";

type EditablePost = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  draft: boolean;
  publishedAt?: string;
};

type PreviewState = {
  html: string;
  wordCount: number;
  readingTimeMinutes: number;
};

const EMPTY_PREVIEW: PreviewState = {
  html: "<p>Start typing to see the live preview.</p>",
  wordCount: 0,
  readingTimeMinutes: 1,
};

function snapshot(input: {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string;
  publishedAt: string;
}) {
  return JSON.stringify(input);
}

export function PostEditor({ initialPost }: { initialPost: EditablePost }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(initialPost.title);
  const [slug, setSlug] = useState(initialPost.slug);
  const [summary, setSummary] = useState(initialPost.summary);
  const [body, setBody] = useState(initialPost.body);
  const [tags, setTags] = useState(initialPost.tags.join(", "));
  const [publishedAt, setPublishedAt] = useState(initialPost.publishedAt ?? "");
  const [message, setMessage] = useState("Saved files will enqueue a git sync job.");
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isAutosaving, setIsAutosaving] = useState(false);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const deferredBody = useDeferredValue(body);
  const resolvedSlug = slugify(slug || title || "untitled-post");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    snapshot({
      slug: resolvedSlug,
      title,
      summary,
      body,
      tags,
      publishedAt,
    }),
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: deferredBody }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as PreviewState;
        startTransition(() => setPreview(data));
      } catch {
        // Ignore cancelled preview requests.
      }
    }, 120);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [deferredBody]);

  async function submit(
    action: "save-draft" | "schedule" | "publish",
    options?: { silent?: boolean },
  ) {
    if (!options?.silent) {
      setBusyAction(action);
      setMessage(
        action === "save-draft"
          ? "Saving draft and queueing git sync…"
          : action === "schedule"
            ? "Scheduling post and queueing git sync…"
            : "Publishing post and queueing git sync…",
      );
    }

    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        slug: resolvedSlug,
        title,
        summary,
        body,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        publishedAt: publishedAt || undefined,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      editorHref?: string;
      previewHref?: string;
      publishedHref?: string;
      previewShareUrl?: string;
    };

    if (!options?.silent) {
      setBusyAction(null);
    }

    if (!response.ok) {
      if (!options?.silent) {
        setMessage(payload.error ?? "Save failed.");
      }
      return;
    }

    setSlug(resolvedSlug);
    setShareUrl(payload.previewShareUrl ?? "");
    setLastSavedSnapshot(
      snapshot({
        slug: resolvedSlug,
        title,
        summary,
        body,
        tags,
        publishedAt,
      }),
    );
    if (!options?.silent) {
      setMessage("Saved. The worker can pick up the queued sync job.");
      router.replace(payload.editorHref ?? `/write/${resolvedSlug}`);
      router.refresh();
    }
  }

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setMessage(`Uploading ${file.name}…`);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; markdown?: string };

    if (!response.ok || !payload.markdown) {
      setMessage(payload.error ?? "Upload failed.");
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      setBody((current) => `${current}\n${payload.markdown}\n`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    setBody((current) => {
      const next = `${current.slice(0, start)}${payload.markdown}\n${current.slice(end)}`;
      return next;
    });
    setMessage("Image uploaded and markdown inserted.");
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/"),
    );

    const file = item?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    void uploadFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.dataTransfer.files).find((entry) =>
      entry.type.startsWith("image/"),
    );

    if (!file) {
      return;
    }

    event.preventDefault();
    void uploadFile(file);
  }

  async function sharePreview() {
    const response = await fetch("/api/preview/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: resolvedSlug }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.error ?? "Could not generate preview link.");
      return;
    }
    setShareUrl(payload.url);
    setMessage("Preview link generated (24h).");
  }

  function syncPreviewScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    const source = event.currentTarget;
    const target = previewWrapRef.current;
    if (!target) return;

    const sourceMax = source.scrollHeight - source.clientHeight;
    if (sourceMax <= 0) return;
    const ratio = source.scrollTop / sourceMax;
    const targetMax = target.scrollHeight - target.clientHeight;
    target.scrollTop = targetMax * ratio;
  }

  useEffect(() => {
    const nextSnapshot = snapshot({
      slug: resolvedSlug,
      title,
      summary,
      body,
      tags,
      publishedAt,
    });
    const dirty = nextSnapshot !== lastSavedSnapshot;
    if (!dirty || busyAction !== null) return;

    const timer = setTimeout(async () => {
      setIsAutosaving(true);
      await submit("save-draft", { silent: true });
      setIsAutosaving(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [resolvedSlug, title, summary, body, tags, publishedAt, lastSavedSnapshot, busyAction]);

  return (
    <div className="section-stack">
      <section className="panel panel-strong" style={{ padding: "1.4rem" }}>
        <p className="tiny">Editor</p>
        <h1 className="page-title">Textarea first. Preview beside it.</h1>
        <p className="page-subtitle">
          Save draft, schedule, and publish all use the same file-backed flow.
          Paste or drop screenshots straight into the body field.
        </p>
      </section>

      <section className="editor-grid">
        <div className="panel editor-panel section-stack">
          <div className="editor-meta">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="A note worth publishing"
              />
            </div>

            <div className="field">
              <label htmlFor="slug">Slug</label>
              <input
                id="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={resolvedSlug}
              />
            </div>

            <div className="field">
              <label htmlFor="summary">Summary</label>
              <input
                id="summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="What should the feed and list page say?"
              />
            </div>

            <div className="field">
              <label htmlFor="publish-date">Publish date</label>
              <input
                id="publish-date"
                type="datetime-local"
                value={publishedAt ? publishedAt.slice(0, 16) : ""}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="writing, self-hosting"
            />
          </div>

          <div className="split-note">
            <div>
              <strong>Body</strong>
              <div className="tiny">
                {preview.wordCount} words · {preview.readingTimeMinutes} min read
              </div>
            </div>

            <div className="button-row">
              <a className="button button-ghost" href={`/preview/${resolvedSlug}`}>
                Open preview
              </a>
              <button className="button button-ghost" type="button" onClick={() => void sharePreview()}>
                Share preview
              </button>
            </div>
          </div>

          <div className="field">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onScroll={syncPreviewScroll}
              onDragOver={(event) => event.preventDefault()}
              placeholder="Write in Markdown or MDX. Paste screenshots directly."
            />
          </div>

          <div className="button-row">
            <button
              className="button button-secondary"
              disabled={busyAction !== null}
              onClick={() => void submit("save-draft")}
              type="button"
            >
              {busyAction === "save-draft" ? "Saving…" : "Save draft"}
            </button>
            <button
              className="button button-ghost"
              disabled={busyAction !== null}
              onClick={() => void submit("schedule")}
              type="button"
            >
              {busyAction === "schedule" ? "Scheduling…" : "Schedule"}
            </button>
            <button
              className="button button-primary"
              disabled={busyAction !== null}
              onClick={() => void submit("publish")}
              type="button"
            >
              {busyAction === "publish" ? "Publishing…" : "Publish"}
            </button>
          </div>

          <p className="message">{message}</p>
          {isAutosaving ? <p className="message">Autosaving…</p> : null}
          {shareUrl ? <p className="message">{shareUrl}</p> : null}
        </div>

        <aside className="panel editor-panel panel-strong">
          <div className="split-note">
            <div>
              <strong>Live preview</strong>
              <div className="tiny">Same markdown pipeline as the preview route.</div>
            </div>
          </div>

          <div className="preview-wrap" ref={previewWrapRef}>
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
