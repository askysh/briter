"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { slugify } from "@/lib/content/post-document";
import {
  COMMANDS,
  applyCommand,
  continueListOnEnter,
  insertLink,
  type CommandResult,
} from "@/lib/editor/markdown-commands";
import { EditorToolbar, type ToolbarAction } from "@/components/editor-toolbar";

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

type ViewMode = "write" | "split" | "preview";

const EMPTY_PREVIEW: PreviewState = {
  html: "<p>Start typing to see the live preview.</p>",
  wordCount: 0,
  readingTimeMinutes: 1,
};

const VIEW_MODE_KEY = "briter:editor-view";

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

// publishedAt is stored as a UTC ISO instant so scheduling is timezone-correct
// regardless of where the worker runs. The <input type="datetime-local">, by
// contrast, speaks the author's local wall-clock time — so convert at the edges.
function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function localInputToIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function PostEditor({ initialPost }: { initialPost: EditablePost }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialPost.title);
  const [slug, setSlug] = useState(initialPost.slug);
  const [summary, setSummary] = useState(initialPost.summary);
  const [body, setBody] = useState(initialPost.body);
  const [tags, setTags] = useState(initialPost.tags.join(", "));
  const [publishedAt, setPublishedAt] = useState(initialPost.publishedAt ?? "");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const deferredBody = useDeferredValue(body);
  const resolvedSlug = slugify(slug || title || "untitled-post");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    snapshot({ slug: resolvedSlug, title, summary, body, tags, publishedAt }),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = window.localStorage.getItem(VIEW_MODE_KEY);
      if (stored === "write" || stored === "split" || stored === "preview") {
        setViewMode(stored);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  }

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

  const submit = useCallback(
    async (action: "save-draft" | "schedule" | "publish", options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setBusyAction(action);
        setMessage("");
      }
      setIsSaving(true);

      let response: Response;
      let payload: {
        error?: string;
        editorHref?: string;
        previewHref?: string;
        publishedHref?: string;
        previewShareUrl?: string;
      };
      try {
        response = await fetch("/api/publish", {
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
        // A proxy error page or crashed handler returns non-JSON; surface it
        // as a failed save instead of leaving the editor stuck on "Saving".
        payload = await response.json().catch(() => ({
          error: `Save failed (HTTP ${response.status}).`,
        }));
      } catch {
        response = new Response(null, { status: 599 });
        payload = { error: "Save failed: the server could not be reached." };
      } finally {
        if (!options?.silent) {
          setBusyAction(null);
        }
        setIsSaving(false);
      }

      if (!response.ok) {
        setMessage(payload.error ?? "Save failed.");
        return;
      }

      setSlug(resolvedSlug);
      setShareUrl(payload.previewShareUrl ?? "");
      setLastSavedSnapshot(
        snapshot({ slug: resolvedSlug, title, summary, body, tags, publishedAt }),
      );
      if (!options?.silent) {
        setMessage(
          action === "publish"
            ? "Published. Git sync is queued."
            : action === "schedule"
              ? "Scheduled. Git sync is queued."
              : "Draft saved.",
        );
        router.replace(payload.editorHref ?? `/write/${resolvedSlug}`);
        router.refresh();
      }
    },
    [resolvedSlug, title, summary, body, tags, publishedAt, router],
  );

  const applyResult = useCallback((result: CommandResult) => {
    setBody(result.value);
    const textarea = textareaRef.current;
    if (!textarea) return;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.start, result.end);
    });
  }, []);

  const currentSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return { value: body, start: body.length, end: body.length };
    }
    return {
      value: textarea.value,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }, [body]);

  const handleToolbarAction = useCallback(
    (action: ToolbarAction) => {
      if (action.type === "image") {
        fileInputRef.current?.click();
        return;
      }
      if (action.type === "link") {
        applyResult(insertLink(currentSelection()));
        return;
      }
      applyResult(applyCommand(currentSelection(), COMMANDS[action.command]));
    },
    [applyResult, currentSelection],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const meta = event.metaKey || event.ctrlKey;

    if (meta) {
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        applyResult(applyCommand(currentSelection(), COMMANDS.bold));
        return;
      }
      if (key === "i") {
        event.preventDefault();
        applyResult(applyCommand(currentSelection(), COMMANDS.italic));
        return;
      }
      if (key === "k") {
        event.preventDefault();
        applyResult(insertLink(currentSelection()));
        return;
      }
      if (key === "e") {
        event.preventDefault();
        applyResult(applyCommand(currentSelection(), COMMANDS.inlineCode));
        return;
      }
      return;
    }

    if (event.key === "Enter") {
      const result = continueListOnEnter(currentSelection());
      if (result) {
        event.preventDefault();
        applyResult(result);
      }
      return;
    }

    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      const selection = currentSelection();
      const next =
        selection.value.slice(0, selection.start) + "  " + selection.value.slice(selection.end);
      applyResult({ value: next, start: selection.start + 2, end: selection.start + 2 });
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

    const selection = currentSelection();
    const inserted = `${payload.markdown}\n`;
    const next =
      selection.value.slice(0, selection.start) + inserted + selection.value.slice(selection.end);
    applyResult({
      value: next,
      start: selection.start + inserted.length,
      end: selection.start + inserted.length,
    });
    setMessage("Image uploaded.");
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
    try {
      await navigator.clipboard.writeText(payload.url);
      setMessage("Preview link copied to clipboard (valid 24h).");
    } catch {
      setMessage("Preview link generated (valid 24h).");
    }
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

    const timer = setTimeout(() => {
      void submit("save-draft", { silent: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [resolvedSlug, title, summary, body, tags, publishedAt, lastSavedSnapshot, busyAction, submit]);

  useEffect(() => {
    function onGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void submit("save-draft");
      }
    }
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [submit]);

  const isDirty =
    snapshot({ slug: resolvedSlug, title, summary, body, tags, publishedAt }) !==
    lastSavedSnapshot;
  const saveState = isSaving ? "saving" : isDirty ? "dirty" : slug ? "saved" : "idle";
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "dirty"
          ? "Unsaved changes"
          : "Draft";

  const showEditorPane = viewMode !== "preview";
  const showPreviewPane = viewMode !== "write";

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <div className="editor-topbar-status">
          <span
            className={`editor-save-dot editor-save-dot-${saveState}`}
            aria-hidden="true"
          />
          <span className="tiny">{saveLabel}</span>
          <span className="tiny editor-topbar-counts">
            {preview.wordCount} words · {preview.readingTimeMinutes} min read
          </span>
        </div>

        <div className="editor-view-toggle" role="group" aria-label="Editor view">
          {(["write", "split", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={viewMode === mode ? "is-active" : undefined}
              onClick={() => changeViewMode(mode)}
            >
              {mode === "write" ? "Write" : mode === "split" ? "Split" : "Preview"}
            </button>
          ))}
        </div>

        <div className="button-row editor-topbar-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={() => void sharePreview()}
          >
            Share preview
          </button>
          <button
            className="button button-secondary"
            disabled={busyAction !== null}
            onClick={() => void submit("save-draft")}
            type="button"
          >
            {busyAction === "save-draft" ? "Saving…" : "Save draft"}
          </button>
          <button
            className="button button-secondary"
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
      </header>

      {message ? <p className="editor-message">{message}</p> : null}
      {shareUrl ? (
        <p className="editor-message">
          Share link: <a href={shareUrl}>{shareUrl}</a>
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
          event.target.value = "";
        }}
      />

      <input
        id="title"
        className="editor-title-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Post title"
        aria-label="Post title"
      />

      <details className="editor-settings">
        <summary>
          Post settings
          <span className="tiny editor-settings-hint">
            /{resolvedSlug}
            {tags.trim() ? ` · ${tags}` : ""}
          </span>
        </summary>
        <div className="editor-meta">
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
            <label htmlFor="publish-date">Publish date</label>
            <input
              id="publish-date"
              type="datetime-local"
              value={isoToLocalInput(publishedAt)}
              onChange={(event) =>
                setPublishedAt(localInputToIso(event.target.value))
              }
            />
          </div>

          <div className="field editor-meta-wide">
            <label htmlFor="summary">Summary</label>
            <input
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What should the feed and list page say?"
            />
          </div>

          <div className="field editor-meta-wide">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="writing, self-hosting"
            />
          </div>
        </div>
      </details>

      <div
        className={`editor-workspace ${
          viewMode === "split" ? "editor-workspace-split" : "editor-workspace-single"
        }`}
      >
        {showEditorPane ? (
          <div className="editor-pane">
            <EditorToolbar onAction={handleToolbarAction} />
            <textarea
              ref={textareaRef}
              className="editor-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onScroll={syncPreviewScroll}
              onDragOver={(event) => event.preventDefault()}
              placeholder="Tell your story. Markdown works — or use the toolbar above. Paste or drop images straight in."
              aria-label="Post body"
            />
          </div>
        ) : null}

        {showPreviewPane ? (
          <div className="editor-pane editor-preview-pane">
            <div className="editor-preview-head tiny">
              Live preview
              <a href={`/preview/${resolvedSlug}`}>Open full preview →</a>
            </div>
            <div className="preview-wrap" ref={previewWrapRef}>
              <div className="prose" dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
