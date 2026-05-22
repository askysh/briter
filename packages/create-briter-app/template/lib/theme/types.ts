export type ThemeTokens = {
  bg?: string;
  fg?: string;
  muted?: string;
  accent?: string;
  accentStrong?: string;
  border?: string;
  panel?: string;
  panelStrong?: string;
  link?: string;
  fontBody?: string;
  fontUi?: string;
  contentWidth?: string;
  radius?: string;
};

export type EditorWidth = "narrow" | "default" | "wide";
export type PanelDensity = "compact" | "default";

export type LayoutPrefs = {
  editorWidth: EditorWidth;
  previewChrome: boolean;
  panelDensity: PanelDensity;
};

export type ThemeConfig = {
  hostCss: string;
  overrides: ThemeTokens;
  layout: LayoutPrefs;
};

export type ResolvedTheme = {
  tokens: Required<ThemeTokens>;
  extracted: ThemeTokens;
  layout: LayoutPrefs;
  hostCss: string;
};
