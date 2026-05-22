"use client";

import { FormEvent, useState } from "react";

export default function SetupPage() {
  const [siteName, setSiteName] = useState("Briter");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteAuthor, setSiteAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [enableTotp, setEnableTotp] = useState(false);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName,
        siteDescription,
        siteAuthor,
        password,
        enableTotp,
      }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      totpUri?: string;
    };
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Setup failed.");
      return;
    }

    setTotpUri(data.totpUri ?? null);
    window.location.href = "/login";
  }

  return (
    <main className="page-shell">
      <section className="section-grid">
        <h1>Setup Briter</h1>
        <form className="stack" onSubmit={onSubmit}>
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Site name" required />
          <input value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} placeholder="Site description" />
          <input value={siteAuthor} onChange={(e) => setSiteAuthor(e.target.value)} placeholder="Author name" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" type="password" minLength={10} required />
          <label>
            <input type="checkbox" checked={enableTotp} onChange={(e) => setEnableTotp(e.target.checked)} />
            Enable TOTP
          </label>
          <button type="submit">Complete setup</button>
          {error ? <p>{error}</p> : null}
          {totpUri ? <p>{totpUri}</p> : null}
        </form>
      </section>
    </main>
  );
}
