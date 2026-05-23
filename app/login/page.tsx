import { redirect } from "next/navigation";

import { isFirstBoot } from "@/lib/config/runtime-config";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isFirstBoot()) redirect("/setup");

  return (
    <main className="page-shell">
      <section className="section-grid">
        <h1>Admin login</h1>
        <LoginForm />
      </section>
    </main>
  );
}
