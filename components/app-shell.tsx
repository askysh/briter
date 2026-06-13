"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/write/new", label: "New Post" },
  { href: "/sections", label: "Sections" },
  { href: "/settings", label: "Settings" },
  { href: "/docs/getting-started", label: "Docs", prefix: "/docs" },
];

const PUBLIC_PREFIXES = ["/login", "/setup", "/posts", "/preview"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSignOut = !PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    const prefix = item.prefix ?? item.href;
    return pathname === item.href || pathname.startsWith(`${prefix}/`) || pathname === prefix;
  }

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-header-inner">
          <div className="brand">
            <Link className="brand-title" href="/admin">
              Briter
            </Link>
            <span className="brand-subtitle">Write. Publish. Own it.</span>
          </div>

          <nav className="shell-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item) ? "shell-nav-active" : undefined}
              >
                {item.label}
              </Link>
            ))}
            {showSignOut ? (
              <button className="shell-signout" type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="shell-main">{children}</main>
    </div>
  );
}
