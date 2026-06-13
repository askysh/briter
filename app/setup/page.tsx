"use client";

import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";

type DiskInfo = { totalBytes: number; freeBytes: number; usedBytes: number };

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const DEFAULT_CAP_MB = 500;

export default function SetupPage() {
  const [siteName, setSiteName] = useState("Briter");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteAuthor, setSiteAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [enableTotp, setEnableTotp] = useState(false);
  const [capMb, setCapMb] = useState(DEFAULT_CAP_MB);
  const [disk, setDisk] = useState<DiskInfo | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data: { disk?: DiskInfo | null; defaultCapBytes?: number }) => {
        if (!active) return;
        setDisk(data.disk ?? null);
        if (typeof data.defaultCapBytes === "number") {
          setCapMb(Math.round(data.defaultCapBytes / (1024 * 1024)));
        }
      })
      .catch(() => {
        /* disk sensing is informational; ignore failures */
      });
    return () => {
      active = false;
    };
  }, []);

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
        uploadStorageLimitBytes: Math.max(1, capMb) * 1024 * 1024,
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
    if (data.totpUri) {
      setTotpQr(await QRCode.toDataURL(data.totpUri));
    }
    setDone(true);
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

          <fieldset className="stack">
            <legend>Storage</legend>
            <p className="tiny">
              {disk
                ? `Data volume: ${formatBytes(disk.freeBytes)} free of ${formatBytes(disk.totalBytes)} total.`
                : "Sensing data volume…"}
            </p>
            <label>
              Provisioned upload cap (MB)
              <input
                type="number"
                min={1}
                value={capMb}
                onChange={(e) => setCapMb(Number.parseInt(e.target.value, 10) || 0)}
              />
            </label>
          </fieldset>

          <label>
            <input type="checkbox" checked={enableTotp} onChange={(e) => setEnableTotp(e.target.checked)} />
            Enable TOTP
          </label>
          <button type="submit">Complete setup</button>
          {error ? <p>{error}</p> : null}
          {totpUri ? <p>{totpUri}</p> : null}
          {/* QR code is a runtime data URI — next/image requires a known src */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {totpQr ? <img src={totpQr} alt="TOTP QR" style={{ width: 180, height: 180 }} /> : null}
          {done ? <a className="button button-primary" href="/login">Continue to login</a> : null}
        </form>
      </section>
    </main>
  );
}
