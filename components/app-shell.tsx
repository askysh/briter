import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-header-inner">
          <div className="brand">
            <Link className="brand-title" href="/">
              Briter
            </Link>
            <span className="brand-subtitle">Write. Publish. Own it.</span>
          </div>

          <nav className="shell-nav" aria-label="Primary">
            <Link href="/">Dashboard</Link>
            <Link href="/write/new">New Post</Link>
            <Link href="/settings">Settings</Link>
            <Link href="/docs/local-development">Docs</Link>
          </nav>
        </div>
      </header>

      <main className="shell-main">{children}</main>
    </div>
  );
}
