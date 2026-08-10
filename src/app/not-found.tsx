import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page">
      <div className="status-card">
        <h1>Page not found</h1>
        <p>The page you requested is not available.</p>
        <Link className="auth-submit auth-submit--link" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
