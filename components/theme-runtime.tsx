import { EDITOR_WIDTH_PX, PANEL_PADDING } from "@/lib/theme/defaults";
import { resolveTheme } from "@/lib/theme/resolve";
import { loadThemeConfig } from "@/lib/theme/store";

function safeCssValue(value: string): string {
  return value.replace(/</g, "\\3c ");
}

function buildRootVars(theme: ReturnType<typeof resolveTheme>): string {
  const t = theme.tokens;
  const editorWidth = EDITOR_WIDTH_PX[theme.layout.editorWidth];
  const panelPadding = PANEL_PADDING[theme.layout.panelDensity];

  const entries: [string, string][] = [
    ["--briter-bg", t.bg],
    ["--briter-fg", t.fg],
    ["--briter-muted", t.muted],
    ["--briter-border", t.border],
    ["--briter-panel", t.panel],
    ["--briter-panel-strong", t.panelStrong],
    ["--briter-accent", t.accent],
    ["--briter-accent-strong", t.accentStrong],
    ["--briter-link", t.link],
    ["--briter-font-body", t.fontBody],
    ["--briter-font-ui", t.fontUi],
    ["--briter-content-width", t.contentWidth],
    ["--briter-editor-width", editorWidth],
    ["--briter-radius", t.radius],
    ["--briter-panel-padding", panelPadding],
  ];

  const lines = entries.map(
    ([name, value]) => `  ${name}: ${safeCssValue(value)};`,
  );
  return `:root {\n${lines.join("\n")}\n}\n`;
}

export async function ThemeRuntime() {
  const config = await loadThemeConfig();
  const theme = resolveTheme(config);
  return <style id="briter-theme-runtime">{buildRootVars(theme)}</style>;
}
