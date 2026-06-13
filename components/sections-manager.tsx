"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  Section,
  SectionOrder,
  SectionSource,
  SectionType,
} from "@/lib/sections/types";

type NoteOption = { slug: string; title: string };

type Draft = {
  id: string;
  type: SectionType;
  enabled: boolean;
  page: string;
  source: SectionSource;
  tag: string;
  slugs: string[];
  order: SectionOrder;
  count: string;
};

function toDraft(section: Section): Draft {
  return {
    id: section.id,
    type: section.type,
    enabled: section.enabled,
    page: section.page ?? "",
    source: section.source,
    tag: section.tag ?? "",
    slugs: section.slugs ?? [],
    order: section.order,
    count: section.count != null ? String(section.count) : "",
  };
}

// Mirror of the server contract: drop fields that don't apply so we send a
// clean payload the API will accept.
function toPayload(draft: Draft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: draft.id,
    type: draft.type,
    enabled: draft.enabled,
    source: draft.source,
    order: draft.order,
  };
  if (draft.type === "list") payload.page = draft.page;
  if (draft.source === "tag") payload.tag = draft.tag;
  if (draft.source === "manual") payload.slugs = draft.slugs;
  if (draft.count.trim() !== "") payload.count = Number(draft.count);
  return payload;
}

export function SectionsManager({
  initialSections,
  noteOptions,
}: {
  initialSections: Section[];
  noteOptions: NoteOption[];
}) {
  const router = useRouter();
  const [sections] = useState(initialSections);
  const [newId, setNewId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function save(draft: Draft) {
    setError(null);
    const res = await fetch(`/api/sections/${encodeURIComponent(draft.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(draft)),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save section.");
      return;
    }
    refresh();
  }

  async function create() {
    setError(null);
    const id = newId.trim();
    if (!id) return;
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        type: "list",
        enabled: true,
        page: "/notes",
        source: "all",
        order: "published-desc",
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to create section.");
      return;
    }
    setNewId("");
    refresh();
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/sections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Failed to delete section.");
      return;
    }
    refresh();
  }

  return (
    <main className="page-shell">
      <section className="panel section-stack">
        <h1>Sections</h1>
        <p className="tiny">
          Sections decide which notes appear, and in what order, on a route the
          site renders. They are content config — not pages. Publishing a
          section syncs its <code>content/sections/&lt;id&gt;.json</code> file
          through the normal queue.
        </p>

        {error && (
          <p className="tiny" style={{ color: "var(--accent-strong, crimson)" }}>
            {error}
          </p>
        )}

        <div className="section-stack" style={{ gap: "0.5rem" }}>
          <label className="tiny" htmlFor="new-section-id">
            New section id (lowercase, hyphenated)
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="new-section-id"
              value={newId}
              placeholder="e.g. essays"
              onChange={(event) => setNewId(event.target.value)}
            />
            <button type="button" onClick={create} disabled={pending || !newId.trim()}>
              Create
            </button>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          noteOptions={noteOptions}
          onSave={save}
          onRemove={remove}
          disabled={pending}
        />
      ))}
    </main>
  );
}

function SectionCard({
  section,
  noteOptions,
  onSave,
  onRemove,
  disabled,
}: {
  section: Section;
  noteOptions: NoteOption[];
  onSave: (draft: Draft) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(section));

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function moveSlug(index: number, delta: number) {
    setDraft((prev) => {
      const next = [...prev.slugs];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, slugs: next };
    });
  }

  function addSlug(slug: string) {
    if (!slug) return;
    setDraft((prev) =>
      prev.slugs.includes(slug) ? prev : { ...prev, slugs: [...prev.slugs, slug] },
    );
  }

  function removeSlug(slug: string) {
    setDraft((prev) => ({ ...prev, slugs: prev.slugs.filter((s) => s !== slug) }));
  }

  const availableToAdd = noteOptions.filter((n) => !draft.slugs.includes(n.slug));

  return (
    <section className="panel section-stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>{section.id}</h2>
        <label className="tiny" style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => set("enabled", event.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className="section-stack" style={{ gap: "0.75rem" }}>
        <label className="tiny">
          Type
          <select value={draft.type} onChange={(e) => set("type", e.target.value as SectionType)}>
            <option value="list">list (collection)</option>
            <option value="highlight">highlight (single item)</option>
          </select>
        </label>

        {draft.type === "list" && (
          <label className="tiny">
            Bound page route
            <input
              value={draft.page}
              placeholder="/notes"
              onChange={(e) => set("page", e.target.value)}
            />
          </label>
        )}

        <label className="tiny">
          Source
          <select value={draft.source} onChange={(e) => set("source", e.target.value as SectionSource)}>
            <option value="all">all notes</option>
            <option value="tag">by tag</option>
            <option value="manual">manual membership</option>
          </select>
        </label>

        {draft.source === "tag" && (
          <label className="tiny">
            Tag
            <input value={draft.tag} onChange={(e) => set("tag", e.target.value)} />
          </label>
        )}

        <label className="tiny">
          Order
          <select value={draft.order} onChange={(e) => set("order", e.target.value as SectionOrder)}>
            <option value="published-desc">newest first</option>
            <option value="published-asc">oldest first</option>
            <option value="manual">manual order</option>
          </select>
        </label>

        <label className="tiny">
          Count {draft.type === "highlight" ? "(usually 1)" : "(cap, optional)"}
          <input
            type="number"
            min={1}
            value={draft.count}
            onChange={(e) => set("count", e.target.value)}
          />
        </label>

        {draft.source === "manual" && (
          <div className="section-stack" style={{ gap: "0.35rem" }}>
            <span className="tiny">Manual membership (drag-free reorder)</span>
            {draft.slugs.length === 0 && <span className="tiny">No notes selected.</span>}
            {draft.slugs.map((slug, index) => (
              <div key={slug} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <button type="button" onClick={() => moveSlug(index, -1)} disabled={index === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveSlug(index, 1)}
                  disabled={index === draft.slugs.length - 1}
                >
                  ↓
                </button>
                <span style={{ flex: 1 }}>{slug}</span>
                <button type="button" onClick={() => removeSlug(slug)}>
                  remove
                </button>
              </div>
            ))}
            {availableToAdd.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  addSlug(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ add a note…</option>
                {availableToAdd.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.title} — /{n.slug}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={() => onSave(draft)} disabled={disabled}>
          Save &amp; publish
        </button>
        <button type="button" onClick={() => onRemove(section.id)} disabled={disabled}>
          Delete
        </button>
      </div>
    </section>
  );
}
