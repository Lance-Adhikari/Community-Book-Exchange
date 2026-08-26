import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookRequestForm } from "@/components/book-forms";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Book Details | Community Book Exchange",
};

export const dynamic = "force-dynamic";

type BookDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookDetailsPage({ params }: BookDetailsPageProps) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const bookId = Number(id);
  const supabase = await createClient();
  const [{ data: book, error }, { data: claimsData }] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, owner_id, title, author, published_year, isbn, description, condition, status, owner_display_name, categories(name)",
      )
      .eq("id", bookId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);

  if (error || !book) {
    notFound();
  }

  const userId = claimsData?.claims?.sub;
  const canRequest = book.status === "available" && Boolean(book.owner_id) && book.owner_id !== userId;
  const isOwner = Boolean(userId) && book.owner_id === userId;

  return (
    <>
      <SiteHeader title="Community Book Exchange" navigation="homepage" />
      <main className="book-details-main">
        <Link className="book-back-link" href="/books">← Back to Browse Books</Link>
        <article className="book-details-card">
          <div className="book-details-card__heading">
            <div>
              <p className="catalog-eyebrow">Book details</p>
              <h2>{book.title}</h2>
              <p className="book-details-card__author">
                {book.author ? `by ${book.author}` : "Author not listed"}
              </p>
            </div>
            <span className="book-card__status">{book.status.replaceAll("_", " ")}</span>
          </div>

          <dl className="book-details-list">
            <div><dt>Category</dt><dd>{book.categories?.name ?? "Other / Uncategorized"}</dd></div>
            {book.published_year ? <div><dt>Published</dt><dd>{book.published_year}</dd></div> : null}
            {book.condition ? <div><dt>Condition</dt><dd>{book.condition.replaceAll("_", " ")}</dd></div> : null}
            {book.isbn ? <div><dt>ISBN</dt><dd>{book.isbn}</dd></div> : null}
            <div><dt>Shared by</dt><dd>{book.owner_display_name}</dd></div>
          </dl>

          {book.description ? (
            <section className="book-description" aria-labelledby="book-description-title">
              <h3 id="book-description-title">Description</h3>
              <p>{book.description}</p>
            </section>
          ) : null}

          <section className="book-request" aria-labelledby="book-request-title">
            <h3 id="book-request-title">Request this book</h3>
            {isOwner ? (
              <p>This book belongs to your account and can be managed from My Books.</p>
            ) : !canRequest ? (
              <p>This book is not currently available for requests.</p>
            ) : userId ? (
              <BookRequestForm bookId={book.id} />
            ) : (
              <p>
                <Link className="primary-link-button" href="/login">
                  Log in to request this book
                </Link>
              </p>
            )}
          </section>
        </article>
      </main>
    </>
  );
}
