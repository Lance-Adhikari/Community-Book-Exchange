import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddBookForm } from "@/components/book-forms";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Add Book | Community Book Exchange",
};

export const dynamic = "force-dynamic";

export default async function AddBookPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="book-form-main">
        <Link className="book-back-link" href="/my-books">← Back to My Books</Link>
        <section className="book-form-card" aria-labelledby="add-book-title">
          <div className="book-form-card__heading">
            <p className="catalog-eyebrow">Your collection</p>
            <h2 id="add-book-title">Add Book</h2>
            <p>Add a book you own to the Community Book Exchange catalog.</p>
          </div>
          {error ? (
            <p className="catalog-message" role="alert">Categories could not be loaded. Please try again later.</p>
          ) : (
            <AddBookForm categories={categories} />
          )}
        </section>
      </main>
    </>
  );
}
