export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { isFirstBoot } from "@/lib/config/runtime-config";
import { loadSecrets } from "@/lib/config/secrets";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isFirstBoot()) redirect("/setup");

  const secrets = await loadSecrets();
  const totpEnabled = Boolean(secrets.totpSecret);

  return (
    <main className="login-shell">
      <section className="panel panel-strong login-card">
        <p className="tiny">Briter</p>
        <h1 className="login-title">Welcome back</h1>
        <p className="page-subtitle">Sign in to write and publish.</p>
        <LoginForm totpEnabled={totpEnabled} />
      </section>
    </main>
  );
}
