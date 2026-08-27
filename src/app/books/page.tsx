import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Browse Books | Community Book Exchange",
};

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: books, error } = await supabase
    .from("books")
    .select(
      "id, title, author, published_year, description, condition, status, owner_display_name, categories(name)",
    )
    .eq("is_active", true)
    .order("title");

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="catalog-main">
        <section className="catalog-intro" aria-labelledby="catalog-title">
          <p className="catalog-eyebrow">Community catalog</p>
          <h2 id="catalog-title">Browse Books</h2>
          <p>Explore books shared by members of the Community Book Exchange.</p>
        </section>

        {error ? (
          <p className="catalog-message" role="alert">
            The book catalog could not be loaded. Please try again later.
          </p>
        ) : books.length === 0 ? (
          <p className="catalog-message">No books are available to browse yet.</p>
        ) : (
          <section className="catalog-grid" aria-label={`${books.length} books`}>
            {books.map((book) => (
              <article className="book-card" key={book.id}>
                <div className="book-card__heading">
                  <h3>
                    <Link href={`/books/${book.id}`}>{book.title}</Link>
                  </h3>
                  <span className="book-card__status">
                    {book.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="book-card__author">
                  {book.author ? `by ${book.author}` : "Author not listed"}
                </p>
                <dl className="book-card__details">
                  <div>
                    <dt>Category</dt>
                    <dd>{book.categories?.name ?? "Other / Uncategorized"}</dd>
                  </div>
                  {book.published_year ? (
                    <div>
                      <dt>Published</dt>
                      <dd>{book.published_year}</dd>
                    </div>
                  ) : null}
                  {book.condition ? (
                    <div>
                      <dt>Condition</dt>
                      <dd>{book.condition.replaceAll("_", " ")}</dd>
                    </div>
                  ) : null}
                </dl>
                {book.description ? (
                  <p className="book-card__description">{book.description}</p>
                ) : null}
                <p className="book-card__owner">Shared by {book.owner_display_name}</p>
                <Link className="book-card__link" href={`/books/${book.id}`}>
                  View details
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
