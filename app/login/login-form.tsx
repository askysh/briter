"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, totpCode }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Login failed.");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" type="password" required />
      <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="TOTP code (if enabled)" />
      <button type="submit">Sign in</button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
