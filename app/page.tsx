export const dynamic = "force-dynamic";

import Link from "next/link";

export default async function HomePage() {
  return (
    <main className="page-shell">
      <section className="panel panel-strong hero">
        <div className="section-stack">
          <p className="tiny">Briter</p>
          <h1>Write once, publish from your own infrastructure.</h1>
          <p>
            Briter is a single-user writing system with a built-in reader and
            git-backed publishing workflow.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/posts">
              Read posts
            </Link>
            <Link className="button button-secondary" href="/login">
              Admin login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
