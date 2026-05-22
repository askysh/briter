export const dynamic = "force-dynamic";

import { SettingsForm } from "@/components/settings-form";
import { loadRuntimeConfig } from "@/lib/config/runtime-config";
import { resolveTheme } from "@/lib/theme/resolve";
import { loadThemeConfig } from "@/lib/theme/store";

export default async function SettingsPage() {
  const [config, runtime] = await Promise.all([
    loadThemeConfig(),
    loadRuntimeConfig(),
  ]);
  const resolved = resolveTheme(config);

  return (
    <div className="section-stack">
      <section className="panel panel-strong" style={{ padding: "1.4rem" }}>
        <p className="tiny">Settings</p>
        <h1 className="page-title">Theme &amp; layout</h1>
        <p className="page-subtitle">
          Paste your site&apos;s CSS to adapt Briter&apos;s surface to it. The
          editor keeps stable <code>--briter-*</code> slots; extraction fills
          them from your CSS. Layout controls are Briter&apos;s own.
        </p>
      </section>

      <SettingsForm
        initialConfig={config}
        initialResolved={resolved}
        initialRuntime={{
          siteAdapterKey: runtime.siteAdapterKey,
          publicBaseUrl: runtime.publicBaseUrl,
          publishedHrefTemplate: runtime.publishedHrefTemplate,
        }}
      />
    </div>
  );
}
