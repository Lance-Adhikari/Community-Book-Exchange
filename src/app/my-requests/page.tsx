import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { CancelRequestAction, ReturnLoanAction } from "@/components/workflow-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Requests & Loans | Community Book Exchange" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value));
}

export default async function MyRequestsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login?next=%2Fmy-requests");
  }

  const [requestsResult, loansResult] = await Promise.all([
    supabase
      .from("borrow_requests")
      .select("id, book_id, status, message, expires_at, created_at, books(id, title, author)")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("loans")
      .select("id, book_id, owner_id, borrower_id, status, started_at, due_at, returned_at, books(id, title, author)")
      .or(`owner_id.eq.${userId},borrower_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
  ]);
  const requests = requestsResult.data ?? [];
  const loans = loansResult.data ?? [];
  const hasError = requestsResult.error || loansResult.error;

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="catalog-main workflow-main">
        <section className="catalog-intro" aria-labelledby="requests-title">
          <p className="catalog-eyebrow">Borrowing</p>
          <h2 id="requests-title">My Requests &amp; Loans</h2>
          <p>Track requests you made and active loans involving your account.</p>
        </section>

        {hasError ? <p className="catalog-message" role="alert">Some request information could not be loaded. Please try again later.</p> : null}

        <section className="workflow-section" aria-labelledby="outgoing-title">
          <div className="workflow-section__heading"><h2 id="outgoing-title">Book requests</h2><span>{requests.length}</span></div>
          {requests.length === 0 ? (
            <div className="catalog-message"><p>You have not requested a book yet.</p><Link href="/books">Browse Books</Link></div>
          ) : (
            <div className="workflow-list">
              {requests.map((request) => (
                <article className="workflow-card" key={request.id}>
                  <div className="workflow-card__heading">
                    <h3><Link href={`/books/${request.book_id}`}>{request.books?.title ?? "Book request"}</Link></h3>
                    <span className="book-card__status">{request.status}</span>
                  </div>
                  <p>Requested {formatDate(request.created_at)}.</p>
                  {request.status === "pending" ? <><p className="workflow-card__meta">Expires {formatDate(request.expires_at)} if not accepted.</p><CancelRequestAction requestId={request.id} /></> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="workflow-section" aria-labelledby="loans-title">
          <div className="workflow-section__heading"><h2 id="loans-title">Loans</h2><span>{loans.length}</span></div>
          {loans.length === 0 ? <p className="catalog-message">No loan history yet.</p> : (
            <div className="workflow-list">
              {loans.map((loan) => {
                const role = loan.borrower_id === userId ? "Borrowing" : "Lending";
                return (
                  <article className="workflow-card" key={loan.id}>
                    <div className="workflow-card__heading">
                      <h3><Link href={`/books/${loan.book_id}`}>{loan.books?.title ?? "Book loan"}</Link></h3>
                      <span className="book-card__status">{loan.status}</span>
                    </div>
                    <dl className="workflow-card__details">
                      <div><dt>Your role</dt><dd>{role}</dd></div>
                      <div><dt>Started</dt><dd>{formatDate(loan.started_at)}</dd></div>
                      <div><dt>Due</dt><dd>{formatDate(loan.due_at)}</dd></div>
                      {loan.returned_at ? <div><dt>Returned</dt><dd>{formatDate(loan.returned_at)}</dd></div> : null}
                    </dl>
                    {loan.status === "active" || loan.status === "overdue" ? <ReturnLoanAction loanId={loan.id} /> : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
