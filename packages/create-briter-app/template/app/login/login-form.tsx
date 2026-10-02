"use client";

import { FormEvent, useState } from "react";

export function LoginForm({ totpEnabled }: { totpEnabled: boolean }) {
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, totpCode }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setBusy(false);
      setError(data.error ?? "Login failed.");
      return;
    }
    // Full reload so every server component renders with the new session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin";
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          type="password"
          autoFocus
          autoComplete="current-password"
          required
        />
      </div>

      {totpEnabled ? (
        <div className="field">
          <label htmlFor="totp">Authenticator code</label>
          <input
            id="totp"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </div>
      ) : null}

      <button className="button button-primary login-submit" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      {error ? <p className="login-error">{error}</p> : null}
    </form>
  );
}
