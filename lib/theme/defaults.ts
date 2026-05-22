import type { LayoutPrefs, ThemeConfig, ThemeTokens } from "./types";

export const DEFAULT_TOKENS: Required<ThemeTokens> = {
  bg: "#f6f0e8",
  fg: "#1f1a16",
  muted: "#6c6259",
  accent: "#b85c38",
  accentStrong: "#8b3c1f",
  border: "rgba(31, 26, 22, 0.12)",
  panel: "rgba(255, 255, 255, 0.72)",
  panelStrong: "rgba(255, 255, 255, 0.88)",
  link: "#b85c38",
  fontBody:
    '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  fontUi: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  contentWidth: "760px",
  radius: "24px",
};

export const DEFAULT_LAYOUT: LayoutPrefs = {
  editorWidth: "default",
  previewChrome: true,
  panelDensity: "default",
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  hostCss: "",
  overrides: {},
  layout: DEFAULT_LAYOUT,
};

export const EDITOR_WIDTH_PX: Record<LayoutPrefs["editorWidth"], string> = {
  narrow: "960px",
  default: "1200px",
  wide: "1400px",
};

export const PANEL_PADDING: Record<LayoutPrefs["panelDensity"], string> = {
  compact: "0.85rem",
  default: "1.1rem",
};
