import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteBookForm, EditBookForm } from "@/components/book-forms";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Edit Book | Community Book Exchange",
};

export const dynamic = "force-dynamic";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const bookId = Number(id);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect(`/login?next=${encodeURIComponent(`/books/${bookId}/edit`)}`);
  }

  const [{ data: book, error: bookError }, { data: categories, error: categoryError }] =
    await Promise.all([
      supabase
        .from("books")
        .select("id, owner_id, title, author, category_id, published_year, isbn, description, condition")
        .eq("id", bookId)
        .eq("owner_id", userId)
        .maybeSingle(),
      supabase.from("categories").select("id, name").order("name"),
    ]);

  if (bookError || !book) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="book-form-main">
        <Link className="book-back-link" href={`/books/${book.id}`}>← Back to Book Details</Link>
        <section className="book-form-card" aria-labelledby="edit-book-title">
          <div className="book-form-card__heading">
            <p className="catalog-eyebrow">Owner tools</p>
            <h2 id="edit-book-title">Edit Book</h2>
            <p>Update the catalog information for this book.</p>
          </div>
          {categoryError ? (
            <p className="catalog-message" role="alert">Categories could not be loaded. Please try again later.</p>
          ) : (
            <EditBookForm
              bookId={book.id}
              categories={categories}
              initialValues={{
                title: book.title,
                author: book.author ?? "",
                categoryId: book.category_id?.toString() ?? "",
                publishedYear: book.published_year?.toString() ?? "",
                isbn: book.isbn ?? "",
                description: book.description ?? "",
                condition: book.condition ?? "",
              }}
            />
          )}
          <div className="book-danger-zone">
            <h3>Delete Book</h3>
            <p>Deletion is allowed only when the book has no request or loan history.</p>
            <DeleteBookForm bookId={book.id} />
          </div>
        </section>
      </main>
    </>
  );
}
