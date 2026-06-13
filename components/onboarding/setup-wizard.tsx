"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import {
  MIN_PASSWORD_LENGTH,
  assessPassword,
} from "@/components/onboarding/password-strength";

type DiskInfo = { totalBytes: number; freeBytes: number; usedBytes: number };

type AdapterKey = "local-mdx" | "git-target";

const DEFAULT_CAP_MB = 500;

const STEPS = [
  { id: "site", title: "Your blog" },
  { id: "publishing", title: "Publishing" },
  { id: "password", title: "Password" },
  { id: "security", title: "Two-factor" },
  { id: "review", title: "Finish" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function SetupWizard() {
  const [stepIndex, setStepIndex] = useState(0);

  // Step 1 — site
  const [siteName, setSiteName] = useState("Briter");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteAuthor, setSiteAuthor] = useState("");

  // Step 2 — publishing
  const [adapter, setAdapter] = useState<AdapterKey>("local-mdx");
  const [capMb, setCapMb] = useState(DEFAULT_CAP_MB);
  const [disk, setDisk] = useState<DiskInfo | null>(null);

  // Step 3 — password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 4 — TOTP
  const [enableTotp, setEnableTotp] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  // Submission
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const assessment = useMemo(() => assessPassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirm;

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

  const currentStep: StepId = STEPS[stepIndex].id;

  function stepIsValid(step: StepId): boolean {
    switch (step) {
      case "site":
        return siteName.trim().length > 0;
      case "publishing":
        return capMb >= 1;
      case "password":
        return assessment.acceptable && passwordsMatch;
      case "security":
        // Either TOTP is off, or a secret was provisioned and a code entered.
        return !enableTotp || (Boolean(totpSecret) && totpCode.trim().length >= 6);
      case "review":
        return true;
      default:
        return true;
    }
  }

  async function provisionTotp() {
    setError(null);
    setProvisioning(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provision-totp", siteName }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        totpSecret?: string;
        totpUri?: string;
      };
      if (!res.ok || !data.ok || !data.totpSecret || !data.totpUri) {
        setError(data.error ?? "Couldn't start two-factor setup.");
        return;
      }
      setTotpSecret(data.totpSecret);
      setTotpQr(await QRCode.toDataURL(data.totpUri));
    } catch {
      setError("Couldn't start two-factor setup.");
    } finally {
      setProvisioning(false);
    }
  }

  async function onToggleTotp(next: boolean) {
    setEnableTotp(next);
    setError(null);
    if (next && !totpSecret) {
      await provisionTotp();
    }
  }

  function goNext() {
    setError(null);
    if (!stepIsValid(currentStep)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          siteName,
          siteDescription,
          siteAuthor,
          siteAdapterKey: adapter,
          password,
          enableTotp,
          totpSecret: enableTotp ? totpSecret : undefined,
          totpCode: enableTotp ? totpCode : undefined,
          uploadStorageLimitBytes: Math.max(1, capMb) * 1024 * 1024,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Setup failed. Please review your entries.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Setup failed. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="panel panel-strong wizard-card wizard-done">
        <div className="wizard-done-mark" aria-hidden="true">
          ✓
        </div>
        <h1 className="wizard-title">You&apos;re all set</h1>
        <p className="page-subtitle">
          {siteName.trim() || "Briter"} is configured
          {adapter === "git-target" ? " in external-target mode" : ""}. Sign in to
          write your first post.
        </p>
        <a className="button button-primary wizard-done-cta" href="/login">
          Continue to sign in
        </a>
      </section>
    );
  }

  return (
    <section className="panel panel-strong wizard-card">
      <header className="wizard-head">
        <p className="tiny">Briter setup</p>
        <h1 className="wizard-title">Let&apos;s get your blog running</h1>
        <ol className="wizard-steps" aria-label="Setup progress">
          {STEPS.map((step, i) => {
            const state =
              i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
            return (
              <li
                key={step.id}
                className={`wizard-step wizard-step-${state}`}
                aria-current={i === stepIndex ? "step" : undefined}
              >
                <span className="wizard-step-dot">{i < stepIndex ? "✓" : i + 1}</span>
                <span className="wizard-step-label">{step.title}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <form className="wizard-body" onSubmit={onSubmit}>
        {currentStep === "site" ? (
          <div className="wizard-pane stack">
            <div className="field">
              <label htmlFor="siteName">Site name</label>
              <input
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="My blog"
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="siteDescription">Description</label>
              <input
                id="siteDescription"
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="A short tagline (optional)"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="siteAuthor">Author name</label>
              <input
                id="siteAuthor"
                value={siteAuthor}
                onChange={(e) => setSiteAuthor(e.target.value)}
                placeholder="Your name (optional)"
                autoComplete="name"
              />
            </div>
          </div>
        ) : null}

        {currentStep === "publishing" ? (
          <div className="wizard-pane stack">
            <fieldset className="wizard-choice-group">
              <legend className="wizard-legend">Where does your writing go?</legend>
              <label
                className={`wizard-choice ${adapter === "local-mdx" ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="adapter"
                  value="local-mdx"
                  checked={adapter === "local-mdx"}
                  onChange={() => setAdapter("local-mdx")}
                />
                <span className="wizard-choice-body">
                  <span className="wizard-choice-title">Briter is my blog</span>
                  <span className="wizard-choice-desc">
                    Briter hosts and serves your posts on its built-in reader. The
                    simplest option — recommended.
                  </span>
                </span>
              </label>
              <label
                className={`wizard-choice ${adapter === "git-target" ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="adapter"
                  value="git-target"
                  checked={adapter === "git-target"}
                  onChange={() => setAdapter("git-target")}
                />
                <span className="wizard-choice-body">
                  <span className="wizard-choice-title">
                    Push to my existing site
                  </span>
                  <span className="wizard-choice-desc">
                    Briter writes posts into an external git repo (Next.js, Astro,
                    Hugo…) and your own site renders them.
                  </span>
                </span>
              </label>
            </fieldset>

            {adapter === "git-target" ? (
              <p className="wizard-note" role="note">
                The target repository, branch, and deploy key are configured after
                setup, on the server (<code>BRITER_GIT_*</code> environment) and in{" "}
                <strong>Settings → Publishing</strong>. Briter pushes to a local
                worktree over SSH — no credentials are entered or stored here. You
                can switch modes later in settings.
              </p>
            ) : null}

            <fieldset className="wizard-fieldset stack">
              <legend className="wizard-legend">Upload storage cap</legend>
              <p className="tiny">
                {disk
                  ? `Data volume: ${formatBytes(disk.freeBytes)} free of ${formatBytes(disk.totalBytes)} total.`
                  : "Sensing data volume…"}
              </p>
              <div className="field">
                <label htmlFor="capMb">Provisioned upload cap (MB)</label>
                <input
                  id="capMb"
                  type="number"
                  min={1}
                  value={capMb}
                  onChange={(e) => setCapMb(Number.parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </fieldset>
          </div>
        ) : null}

        {currentStep === "password" ? (
          <div className="wizard-pane stack">
            <p className="wizard-lead">
              This password signs you into the Briter admin. There&apos;s no email
              reset — choose something you&apos;ll keep in your password manager.
            </p>
            <div className="field">
              <label htmlFor="password">Admin password</label>
              <div className="wizard-password-input">
                <input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  aria-describedby="password-reqs"
                  required
                />
                <button
                  type="button"
                  className="wizard-reveal"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {password.length > 0 ? (
              <div
                className={`wizard-strength wizard-strength-${assessment.strength}`}
                aria-live="polite"
              >
                <div className="wizard-strength-track">
                  <span className="wizard-strength-fill" />
                </div>
                <span className="wizard-strength-label">{assessment.label}</span>
              </div>
            ) : null}

            <ul id="password-reqs" className="wizard-reqs">
              {assessment.requirements.map((req) => (
                <li
                  key={req.id}
                  className={req.met ? "is-met" : ""}
                  data-required={req.id === "length" ? "true" : undefined}
                >
                  <span className="wizard-req-mark" aria-hidden="true">
                    {req.met ? "✓" : "○"}
                  </span>
                  {req.label}
                  {req.id === "length" ? "" : " (recommended)"}
                </li>
              ))}
            </ul>

            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-describedby="confirm-hint"
                required
              />
            </div>
            {confirm.length > 0 && !passwordsMatch ? (
              <p id="confirm-hint" className="wizard-inline-error" role="alert">
                Passwords don&apos;t match yet.
              </p>
            ) : null}
          </div>
        ) : null}

        {currentStep === "security" ? (
          <div className="wizard-pane stack">
            <label className="wizard-switch">
              <input
                type="checkbox"
                checked={enableTotp}
                onChange={(e) => onToggleTotp(e.target.checked)}
              />
              <span>
                <span className="wizard-switch-title">
                  Enable two-factor (TOTP)
                </span>
                <span className="wizard-switch-desc">
                  Optional. Adds an authenticator code on top of your password.
                  Off by default — you can turn it on later in settings.
                </span>
              </span>
            </label>

            {enableTotp ? (
              <div className="wizard-totp">
                {provisioning ? (
                  <p className="tiny">Generating your secret…</p>
                ) : totpQr && totpSecret ? (
                  <>
                    <ol className="wizard-totp-steps">
                      <li>Open your authenticator app (1Password, Authy, Google Authenticator…).</li>
                      <li>Scan the QR code, or enter the secret by hand.</li>
                      <li>Type the 6-digit code below to confirm it works.</li>
                    </ol>
                    <div className="wizard-totp-grid">
                      {/* QR is a runtime data URI; next/image needs a known src */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="wizard-qr"
                        src={totpQr}
                        alt="TOTP QR code"
                        width={170}
                        height={170}
                      />
                      <div className="wizard-totp-manual">
                        <span className="tiny">Manual entry secret</span>
                        <code className="wizard-secret">{totpSecret}</code>
                        <div className="field">
                          <label htmlFor="totpCode">Verification code</label>
                          <input
                            id="totpCode"
                            value={totpCode}
                            onChange={(e) =>
                              setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                            placeholder="123456"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={provisionTotp}
                  >
                    Retry generating secret
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {currentStep === "review" ? (
          <div className="wizard-pane stack">
            <p className="wizard-lead">Quick check before you finish.</p>
            <dl className="wizard-summary">
              <div>
                <dt>Site name</dt>
                <dd>{siteName.trim() || "Briter"}</dd>
              </div>
              {siteAuthor.trim() ? (
                <div>
                  <dt>Author</dt>
                  <dd>{siteAuthor.trim()}</dd>
                </div>
              ) : null}
              <div>
                <dt>Publishing</dt>
                <dd>
                  {adapter === "local-mdx"
                    ? "Briter hosts the blog"
                    : "Push to external git repo"}
                </dd>
              </div>
              <div>
                <dt>Upload cap</dt>
                <dd>{capMb} MB</dd>
              </div>
              <div>
                <dt>Two-factor</dt>
                <dd>{enableTotp ? "Enabled & verified" : "Off"}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error ? (
          <p className="wizard-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="wizard-actions">
          {stepIndex > 0 ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={goBack}
              disabled={busy}
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {currentStep === "review" ? (
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? "Setting up…" : "Complete setup"}
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              onClick={goNext}
              disabled={!stepIsValid(currentStep) || provisioning}
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
