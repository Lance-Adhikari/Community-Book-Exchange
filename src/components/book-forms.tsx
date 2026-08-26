"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createBook, requestBook } from "@/app/actions/books";
import { initialBookActionState, type BookActionState } from "@/lib/book-state";

type CategoryOption = {
  id: number;
  name: string;
};

function FormStatus({ state }: { state: BookActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`book-form__message book-form__message--${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="auth-submit" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AddBookForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction] = useActionState(createBook, initialBookActionState);

  return (
    <form className="book-form" action={formAction} noValidate>
      <FormStatus state={state} />

      <div className="book-form__field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" maxLength={200} defaultValue={state.fieldValues?.title} required aria-invalid={Boolean(state.fieldErrors?.title)} />
        {state.fieldErrors?.title ? <span>{state.fieldErrors.title}</span> : null}
      </div>

      <div className="book-form__field">
        <label htmlFor="author">Author</label>
        <input id="author" name="author" maxLength={200} defaultValue={state.fieldValues?.author} aria-invalid={Boolean(state.fieldErrors?.author)} />
        {state.fieldErrors?.author ? <span>{state.fieldErrors.author}</span> : null}
      </div>

      <div className="book-form__row">
        <div className="book-form__field">
          <label htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={state.fieldValues?.categoryId ?? ""} required aria-invalid={Boolean(state.fieldErrors?.categoryId)}>
            <option value="" disabled>Choose a category</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.name}</option>
            ))}
          </select>
          {state.fieldErrors?.categoryId ? <span>{state.fieldErrors.categoryId}</span> : null}
        </div>

        <div className="book-form__field">
          <label htmlFor="publishedYear">Published year</label>
          <input id="publishedYear" name="publishedYear" type="number" min={1000} max={2100} defaultValue={state.fieldValues?.publishedYear} aria-invalid={Boolean(state.fieldErrors?.publishedYear)} />
          {state.fieldErrors?.publishedYear ? <span>{state.fieldErrors.publishedYear}</span> : null}
        </div>
      </div>

      <div className="book-form__row">
        <div className="book-form__field">
          <label htmlFor="isbn">ISBN</label>
          <input id="isbn" name="isbn" maxLength={32} defaultValue={state.fieldValues?.isbn} aria-invalid={Boolean(state.fieldErrors?.isbn)} />
          {state.fieldErrors?.isbn ? <span>{state.fieldErrors.isbn}</span> : null}
        </div>

        <div className="book-form__field">
          <label htmlFor="condition">Condition</label>
          <select id="condition" name="condition" defaultValue={state.fieldValues?.condition ?? ""} aria-invalid={Boolean(state.fieldErrors?.condition)}>
            <option value="">Not specified</option>
            <option value="new">New</option>
            <option value="like_new">Like new</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
          {state.fieldErrors?.condition ? <span>{state.fieldErrors.condition}</span> : null}
        </div>
      </div>

      <div className="book-form__field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={5} maxLength={4000} defaultValue={state.fieldValues?.description} aria-invalid={Boolean(state.fieldErrors?.description)} />
        {state.fieldErrors?.description ? <span>{state.fieldErrors.description}</span> : null}
      </div>

      <SubmitButton label="Add Book" pendingLabel="Adding book…" />
    </form>
  );
}

export function BookRequestForm({ bookId }: { bookId: number }) {
  const [state, formAction] = useActionState(requestBook, initialBookActionState);

  return (
    <form className="book-form book-request-form" action={formAction} noValidate>
      <input type="hidden" name="bookId" value={bookId} />
      <FormStatus state={state} />
      <div className="book-form__field">
        <label htmlFor="requestMessage">Message to the owner (optional)</label>
        <textarea id="requestMessage" name="requestMessage" rows={4} maxLength={2000} aria-invalid={Boolean(state.fieldErrors?.requestMessage)} />
        {state.fieldErrors?.requestMessage ? <span>{state.fieldErrors.requestMessage}</span> : null}
      </div>
      <SubmitButton label="Request this book" pendingLabel="Sending request…" />
    </form>
  );
}
