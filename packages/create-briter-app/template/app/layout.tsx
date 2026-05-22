import type { Metadata } from "next";

import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { ThemeRuntime } from "@/components/theme-runtime";
import { loadThemeConfig } from "@/lib/theme/store";

export const metadata: Metadata = {
  title: "Briter",
  description: "A writer-first app for plain-file publishing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await loadThemeConfig();
  const bodyClasses = [
    `briter-density-${config.layout.panelDensity}`,
    config.layout.previewChrome
      ? "briter-preview-chrome-on"
      : "briter-preview-chrome-off",
  ].join(" ");

  return (
    <html lang="en">
      <body className={bodyClasses}>
        <ThemeRuntime />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
