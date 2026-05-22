"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  EditorWidth,
  LayoutPrefs,
  PanelDensity,
  ResolvedTheme,
  ThemeConfig,
  ThemeTokens,
} from "@/lib/theme/types";

type TokenRow = {
  key: keyof ThemeTokens;
  label: string;
  kind: "color" | "font" | "length";
};

const COLOR_ROWS: TokenRow[] = [
  { key: "bg", label: "Background", kind: "color" },
  { key: "fg", label: "Foreground", kind: "color" },
  { key: "muted", label: "Muted", kind: "color" },
  { key: "accent", label: "Accent", kind: "color" },
  { key: "accentStrong", label: "Accent (strong)", kind: "color" },
  { key: "border", label: "Border", kind: "color" },
  { key: "panel", label: "Panel", kind: "color" },
  { key: "panelStrong", label: "Panel (strong)", kind: "color" },
  { key: "link", label: "Link", kind: "color" },
];

const TYPE_ROWS: TokenRow[] = [
  { key: "fontBody", label: "Body font", kind: "font" },
  { key: "fontUi", label: "UI font", kind: "font" },
];

const SHAPE_ROWS: TokenRow[] = [
  { key: "contentWidth", label: "Content width", kind: "length" },
  { key: "radius", label: "Radius", kind: "length" },
];

export function SettingsForm({
  initialConfig,
  initialResolved,
}: {
  initialConfig: ThemeConfig;
  initialResolved: ResolvedTheme;
}) {
  const router = useRouter();
  const [hostCss, setHostCss] = useState(initialConfig.hostCss);
  const [overrides, setOverrides] = useState<ThemeTokens>(
    initialConfig.overrides,
  );
  const [layout, setLayout] = useState<LayoutPrefs>(initialConfig.layout);
  const [resolved, setResolved] = useState<ResolvedTheme>(initialResolved);
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const extractedCount = useMemo(
    () => Object.keys(resolved.extracted).length,
    [resolved.extracted],
  );

  async function refreshResolved(nextConfig: ThemeConfig) {
    const response = await fetch("/api/settings/theme/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig),
    });
    if (response.ok) {
      const data = (await response.json()) as { resolved: ResolvedTheme };
      setResolved(data.resolved);
    }
  }

  function onHostCssChange(value: string) {
    setHostCss(value);
    startTransition(() => {
      void refreshResolved({ hostCss: value, overrides, layout });
    });
  }

  function onOverrideChange(key: keyof ThemeTokens, value: string) {
    const nextOverrides = { ...overrides };
    if (value.trim() === "") {
      delete nextOverrides[key];
    } else {
      nextOverrides[key] = value;
    }
    setOverrides(nextOverrides);
    startTransition(() => {
      void refreshResolved({ hostCss, overrides: nextOverrides, layout });
    });
  }

  function onLayoutChange(next: LayoutPrefs) {
    setLayout(next);
    startTransition(() => {
      void refreshResolved({ hostCss, overrides, layout: next });
    });
  }

  async function save() {
    setIsSaving(true);
    setMessage("Saving…");
    const response = await fetch("/api/settings/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostCss, overrides, layout }),
    });
    setIsSaving(false);

    if (!response.ok) {
      setMessage("Save failed.");
      return;
    }

    setMessage("Saved.");
    router.refresh();
  }

  function reset() {
    setHostCss("");
    setOverrides({});
    setLayout(initialConfig.layout);
    setMessage("");
    startTransition(() => {
      void refreshResolved({
        hostCss: "",
        overrides: {},
        layout: initialConfig.layout,
      });
    });
  }

  return (
    <div className="settings">
      <header className="settings-header">
        <div>
          <h1 className="settings-title">Theme &amp; layout</h1>
          <p className="settings-subtitle">
            Paste the CSS from your site. Briter extracts tokens it knows how
            to use — the rest is ignored. Layout controls below are
            Briter&apos;s own.
          </p>
        </div>
        <div className="settings-actions">
          {message ? <span className="settings-message">{message}</span> : null}
          <button
            className="button button-ghost"
            type="button"
            onClick={reset}
            disabled={isSaving}
          >
            Reset
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => void save()}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Host CSS</h2>
          <span className="settings-section-hint">
            {extractedCount === 0
              ? "Nothing extracted yet."
              : `${extractedCount} token${extractedCount === 1 ? "" : "s"} extracted${isPending ? " · updating…" : ""}`}
          </span>
        </div>
        <textarea
          className="settings-css"
          value={hostCss}
          onChange={(event) => onHostCssChange(event.target.value)}
          placeholder="/* Paste your site's CSS */"
          spellCheck={false}
        />
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Tokens</h2>
          <span className="settings-section-hint">
            defaults ← extraction ← overrides
          </span>
        </div>

        <TokenGroup
          label="Color"
          rows={COLOR_ROWS}
          resolved={resolved}
          overrides={overrides}
          onOverrideChange={onOverrideChange}
        />
        <TokenGroup
          label="Typography"
          rows={TYPE_ROWS}
          resolved={resolved}
          overrides={overrides}
          onOverrideChange={onOverrideChange}
        />
        <TokenGroup
          label="Shape"
          rows={SHAPE_ROWS}
          resolved={resolved}
          overrides={overrides}
          onOverrideChange={onOverrideChange}
        />
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Layout</h2>
          <span className="settings-section-hint">Briter-specific</span>
        </div>

        <div className="settings-row">
          <label htmlFor="editor-width" className="settings-row-label">
            Editor width
          </label>
          <select
            id="editor-width"
            className="settings-select"
            value={layout.editorWidth}
            onChange={(event) =>
              onLayoutChange({
                ...layout,
                editorWidth: event.target.value as EditorWidth,
              })
            }
          >
            <option value="narrow">Narrow (960px)</option>
            <option value="default">Default (1200px)</option>
            <option value="wide">Wide (1400px)</option>
          </select>
        </div>

        <div className="settings-row">
          <label htmlFor="panel-density" className="settings-row-label">
            Panel density
          </label>
          <select
            id="panel-density"
            className="settings-select"
            value={layout.panelDensity}
            onChange={(event) =>
              onLayoutChange({
                ...layout,
                panelDensity: event.target.value as PanelDensity,
              })
            }
          >
            <option value="default">Default</option>
            <option value="compact">Compact</option>
          </select>
        </div>

        <div className="settings-row">
          <span className="settings-row-label">Preview chrome</span>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={layout.previewChrome}
              onChange={(event) =>
                onLayoutChange({
                  ...layout,
                  previewChrome: event.target.checked,
                })
              }
            />
            <span>
              Show status pill, view toggle, and article header in previews
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}

function TokenGroup({
  label,
  rows,
  resolved,
  overrides,
  onOverrideChange,
}: {
  label: string;
  rows: TokenRow[];
  resolved: ResolvedTheme;
  overrides: ThemeTokens;
  onOverrideChange: (key: keyof ThemeTokens, value: string) => void;
}) {
  return (
    <div className="token-group">
      <div className="token-group-label">{label}</div>
      <ul className="token-list">
        {rows.map((row) => {
          const value = resolved.tokens[row.key];
          const source = resolved.extracted[row.key] ? "host" : "default";
          const override = overrides[row.key] ?? "";
          const isColor = row.kind === "color";
          return (
            <li key={row.key} className="token-row">
              {isColor ? (
                <span
                  className="token-swatch"
                  style={{ background: value }}
                  aria-hidden="true"
                />
              ) : (
                <span className="token-swatch token-swatch-empty" aria-hidden="true" />
              )}
              <span className="token-label">{row.label}</span>
              <span className="token-value" title={value}>
                {value}
              </span>
              <span className={`token-source token-source-${source}`}>
                {source}
              </span>
              <input
                className="token-override"
                aria-label={`${row.label} override`}
                value={override}
                onChange={(event) => onOverrideChange(row.key, event.target.value)}
                placeholder="override"
                spellCheck={false}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
