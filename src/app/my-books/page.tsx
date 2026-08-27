import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { OwnerRequestActions, ReturnLoanAction } from "@/components/workflow-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Books | Community Book Exchange" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value));
}

export default async function MyBooksPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login?next=%2Fmy-books");
  }

  const [booksResult, requestsResult, loansResult] = await Promise.all([
    supabase.from("books").select("id, title, author, status, is_active, source_kind, categories(name)").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("borrow_requests").select("id, book_id, status, message, expires_at, created_at, books(id, title)").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("loans").select("id, book_id, status, started_at, due_at, returned_at, books(id, title)").eq("owner_id", userId).order("created_at", { ascending: false }),
  ]);
  const books = booksResult.data ?? [];
  const incomingRequests = requestsResult.data ?? [];
  const lendingLoans = loansResult.data ?? [];
  const pendingRequests = incomingRequests.filter((request) => request.status === "pending");
  const openLoans = lendingLoans.filter((loan) => loan.status === "active" || loan.status === "overdue");
  const hasError = booksResult.error || requestsResult.error || loansResult.error;

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="catalog-main workflow-main">
        <section className="catalog-intro catalog-intro--with-action" aria-labelledby="my-books-title">
          <div>
            <p className="catalog-eyebrow">Your collection</p>
            <h2 id="my-books-title">My Books</h2>
            <p>Manage books linked to your verified Community Book Exchange account.</p>
          </div>
          <Link className="primary-link-button" href="/books/new">Add Book</Link>
        </section>

        {hasError ? <p className="catalog-message" role="alert">Some account information could not be loaded. Please try again later.</p> : null}

        <section className="workflow-section" aria-labelledby="owned-books-title">
          <div className="workflow-section__heading"><h2 id="owned-books-title">Owned books</h2><span>{books.length}</span></div>
          {books.length === 0 ? (
            <div className="catalog-message"><p>You have not added any books yet.</p><Link href="/books/new">Add your first book</Link></div>
          ) : (
            <div className="catalog-grid">
              {books.map((book) => {
                const requestCount = pendingRequests.filter((request) => request.book_id === book.id).length;
                const loan = openLoans.find((item) => item.book_id === book.id);
                return (
                  <article className="book-card" key={book.id}>
                    <div className="book-card__heading"><h3><Link href={`/books/${book.id}`}>{book.title}</Link></h3><span className="book-card__status">{book.status.replaceAll("_", " ")}</span></div>
                    <p className="book-card__author">{book.author ? `by ${book.author}` : "Author not listed"}</p>
                    <dl className="book-card__details">
                      <div><dt>Category</dt><dd>{book.categories?.name ?? "Other / Uncategorized"}</dd></div>
                      <div><dt>Listing</dt><dd>{book.is_active ? "Active" : "Inactive"}</dd></div>
                      <div><dt>Pending requests</dt><dd>{requestCount}</dd></div>
                      {loan ? <div><dt>Loan</dt><dd>{loan.status}</dd></div> : null}
                      {book.source_kind === "legacy" ? <div><dt>Source</dt><dd>Legacy catalog</dd></div> : null}
                    </dl>
                    <div className="book-card__actions"><Link className="book-card__link" href={`/books/${book.id}`}>View</Link><Link className="book-card__link" href={`/books/${book.id}/edit`}>Edit</Link></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="workflow-section" aria-labelledby="incoming-requests-title">
          <div className="workflow-section__heading"><h2 id="incoming-requests-title">Incoming requests</h2><span>{pendingRequests.length} pending</span></div>
          {incomingRequests.length === 0 ? <p className="catalog-message">No one has requested one of your books yet.</p> : (
            <div className="workflow-list">
              {incomingRequests.map((request) => (
                <article className="workflow-card" key={request.id}>
                  <div className="workflow-card__heading"><h3>{request.books?.title ?? "Book request"}</h3><span className="book-card__status">{request.status}</span></div>
                  <p>Requested by a community member on {formatDate(request.created_at)}.</p>
                  {request.message ? <p className="workflow-card__message">“{request.message}”</p> : null}
                  {request.status === "pending" ? <><p className="workflow-card__meta">Respond before {formatDate(request.expires_at)}.</p><OwnerRequestActions requestId={request.id} /></> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="workflow-section" aria-labelledby="lending-title">
          <div className="workflow-section__heading"><h2 id="lending-title">Loans you are lending</h2><span>{openLoans.length} active</span></div>
          {lendingLoans.length === 0 ? <p className="catalog-message">No lending history yet.</p> : (
            <div className="workflow-list">
              {lendingLoans.map((loan) => (
                <article className="workflow-card" key={loan.id}>
                  <div className="workflow-card__heading"><h3>{loan.books?.title ?? "Book loan"}</h3><span className="book-card__status">{loan.status}</span></div>
                  <p>Started {formatDate(loan.started_at)} · Due {formatDate(loan.due_at)}</p>
                  {loan.returned_at ? <p>Returned {formatDate(loan.returned_at)}</p> : null}
                  {loan.status === "active" || loan.status === "overdue" ? <ReturnLoanAction loanId={loan.id} /> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
