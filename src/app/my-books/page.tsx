import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Books | Community Book Exchange",
};

export const dynamic = "force-dynamic";

export default async function MyBooksPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, status, is_active, source_kind, categories(name)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="catalog-main">
        <section className="catalog-intro catalog-intro--with-action" aria-labelledby="my-books-title">
          <div>
            <p className="catalog-eyebrow">Your collection</p>
            <h2 id="my-books-title">My Books</h2>
            <p>Books linked to your verified Community Book Exchange account.</p>
          </div>
          <Link className="primary-link-button" href="/books/new">Add Book</Link>
        </section>

        {error ? (
          <p className="catalog-message" role="alert">Your books could not be loaded. Please try again later.</p>
        ) : books.length === 0 ? (
          <section className="catalog-message">
            <p>You have not added any books yet.</p>
            <Link href="/books/new">Add your first book</Link>
          </section>
        ) : (
          <section className="catalog-grid" aria-label={`${books.length} books you own`}>
            {books.map((book) => (
              <article className="book-card" key={book.id}>
                <div className="book-card__heading">
                  <h3><Link href={`/books/${book.id}`}>{book.title}</Link></h3>
                  <span className="book-card__status">{book.status.replaceAll("_", " ")}</span>
                </div>
                <p className="book-card__author">{book.author ? `by ${book.author}` : "Author not listed"}</p>
                <dl className="book-card__details">
                  <div><dt>Category</dt><dd>{book.categories?.name ?? "Other / Uncategorized"}</dd></div>
                  <div><dt>Listing</dt><dd>{book.is_active ? "Active" : "Inactive"}</dd></div>
                  {book.source_kind === "legacy" ? <div><dt>Source</dt><dd>Legacy catalog</dd></div> : null}
                </dl>
                <Link className="book-card__link" href={`/books/${book.id}`}>View details</Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
