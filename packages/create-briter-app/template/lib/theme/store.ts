import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";

import { resolveBriterPaths } from "@/lib/config/paths";

import { DEFAULT_THEME_CONFIG, DEFAULT_LAYOUT } from "./defaults";
import type { LayoutPrefs, ThemeConfig, ThemeTokens } from "./types";

function themePath(): string {
  const paths = resolveBriterPaths(process.cwd());
  return join(paths.storageRoot, "theme.json");
}

const EDITOR_WIDTHS: LayoutPrefs["editorWidth"][] = ["narrow", "default", "wide"];
const DENSITIES: LayoutPrefs["panelDensity"][] = ["compact", "default"];

function sanitizeOverrides(raw: unknown): ThemeTokens {
  if (!raw || typeof raw !== "object") return {};
  const out: ThemeTokens = {};
  const input = raw as Record<string, unknown>;
  const keys: (keyof ThemeTokens)[] = [
    "bg",
    "fg",
    "muted",
    "accent",
    "accentStrong",
    "border",
    "panel",
    "panelStrong",
    "link",
    "fontBody",
    "fontUi",
    "contentWidth",
    "radius",
  ];
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "") {
      out[key] = value;
    }
  }
  return out;
}

function sanitizeLayout(raw: unknown): LayoutPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT;
  const input = raw as Record<string, unknown>;
  return {
    editorWidth: EDITOR_WIDTHS.includes(input.editorWidth as LayoutPrefs["editorWidth"])
      ? (input.editorWidth as LayoutPrefs["editorWidth"])
      : DEFAULT_LAYOUT.editorWidth,
    previewChrome:
      typeof input.previewChrome === "boolean"
        ? input.previewChrome
        : DEFAULT_LAYOUT.previewChrome,
    panelDensity: DENSITIES.includes(input.panelDensity as LayoutPrefs["panelDensity"])
      ? (input.panelDensity as LayoutPrefs["panelDensity"])
      : DEFAULT_LAYOUT.panelDensity,
  };
}

export function sanitizeThemeConfig(raw: unknown): ThemeConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_THEME_CONFIG;
  const input = raw as Record<string, unknown>;
  return {
    hostCss: typeof input.hostCss === "string" ? input.hostCss : "",
    overrides: sanitizeOverrides(input.overrides),
    layout: sanitizeLayout(input.layout),
  };
}

export async function loadThemeConfig(): Promise<ThemeConfig> {
  try {
    const raw = await fs.readFile(themePath(), "utf8");
    return sanitizeThemeConfig(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_THEME_CONFIG;
    }
    throw err;
  }
}

export async function saveThemeConfig(config: ThemeConfig): Promise<void> {
  const path = themePath();
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(config, null, 2), "utf8");
}
