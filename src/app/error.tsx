"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="status-page">
      <div className="status-card" role="alert">
        <h1>Something went wrong</h1>
        <p>We could not complete that request. Please try again.</p>
        <button className="auth-submit auth-submit--compact" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
