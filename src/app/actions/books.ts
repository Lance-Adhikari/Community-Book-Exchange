"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { BookActionState } from "@/lib/book-state";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

const BOOK_CONDITIONS = new Set(["new", "like_new", "good", "fair", "poor"]);

function valueFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function errorState(
  message: string,
  fieldErrors?: BookActionState["fieldErrors"],
  fieldValues?: BookActionState["fieldValues"],
): BookActionState {
  return { status: "error", message, fieldErrors, fieldValues };
}

function parsePositiveInteger(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function createBook(
  _previousState: BookActionState,
  formData: FormData,
): Promise<BookActionState> {
  const title = valueFrom(formData, "title");
  const author = valueFrom(formData, "author");
  const categoryIdValue = valueFrom(formData, "categoryId");
  const publishedYearValue = valueFrom(formData, "publishedYear");
  const isbn = valueFrom(formData, "isbn");
  const description = valueFrom(formData, "description");
  const conditionValue = valueFrom(formData, "condition");
  const fieldValues = {
    title,
    author,
    categoryId: categoryIdValue,
    publishedYear: publishedYearValue,
    isbn,
    description,
    condition: conditionValue,
  };
  const fieldErrors: BookActionState["fieldErrors"] = {};
  const categoryId = parsePositiveInteger(categoryIdValue);
  const publishedYear = publishedYearValue ? Number(publishedYearValue) : null;

  if (title.length < 1 || title.length > 200) {
    fieldErrors.title = "Enter a title of 200 characters or fewer.";
  }
  if (author.length > 200) {
    fieldErrors.author = "Use 200 characters or fewer for the author.";
  }
  if (!categoryId) {
    fieldErrors.categoryId = "Choose a category.";
  }
  if (
    publishedYearValue &&
    (!Number.isInteger(publishedYear) || publishedYear === null || publishedYear < 1000 || publishedYear > 2100)
  ) {
    fieldErrors.publishedYear = "Enter a year between 1000 and 2100.";
  }
  if (isbn.length > 32) {
    fieldErrors.isbn = "Use 32 characters or fewer for the ISBN.";
  }
  if (description.length > 4000) {
    fieldErrors.description = "Use 4,000 characters or fewer for the description.";
  }
  if (conditionValue && !BOOK_CONDITIONS.has(conditionValue)) {
    fieldErrors.condition = "Choose a valid condition.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState("Please correct the highlighted fields.", fieldErrors, fieldValues);
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId!)
    .maybeSingle();

  if (categoryError || !category) {
    return errorState("The selected category is no longer available.", undefined, fieldValues);
  }

  const condition = conditionValue
    ? (conditionValue as Database["public"]["Enums"]["book_condition"])
    : null;
  const { data: book, error } = await supabase
    .from("books")
    .insert({
      owner_id: userId,
      title,
      author: author || null,
      category_id: category.id,
      published_year: publishedYear,
      isbn: isbn || null,
      description: description || null,
      condition,
    })
    .select("id")
    .single();

  if (error || !book) {
    return errorState("We could not add this book. Please try again.", undefined, fieldValues);
  }

  revalidatePath("/books");
  revalidatePath("/my-books");
  redirect(`/books/${book.id}`);
}

export async function requestBook(
  _previousState: BookActionState,
  formData: FormData,
): Promise<BookActionState> {
  const bookId = parsePositiveInteger(valueFrom(formData, "bookId"));
  const message = valueFrom(formData, "requestMessage");

  if (!bookId) {
    return errorState("This book could not be requested.");
  }
  if (message.length > 2000) {
    return errorState("Please shorten your message.", {
      requestMessage: "Use 2,000 characters or fewer.",
    });
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  // The database trigger supplies requester_id, owner_id, status, and expiry.
  // Generated types cannot express those trigger-populated required columns.
  const request = {
    book_id: bookId,
    message: message || null,
  } as Database["public"]["Tables"]["borrow_requests"]["Insert"];
  const { error } = await supabase.from("borrow_requests").insert(request);

  if (error) {
    return errorState("This book could not be requested. It may no longer be available.");
  }

  revalidatePath(`/books/${bookId}`);
  return { status: "success", message: "Your request has been sent to the book owner." };
}
