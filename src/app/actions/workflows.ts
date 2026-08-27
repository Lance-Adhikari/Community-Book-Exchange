"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { WorkflowActionState } from "@/lib/workflow-state";

function valueFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function errorState(message: string): WorkflowActionState {
  return { status: "error", message };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return { supabase, userId: data.claims.sub };
}

function refreshWorkflowPages(bookId?: number) {
  revalidatePath("/dashboard");
  revalidatePath("/books");
  revalidatePath("/my-books");
  revalidatePath("/my-requests");

  if (bookId) {
    revalidatePath(`/books/${bookId}`);
  }
}

export async function approveBorrowRequest(
  _previousState: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const requestId = valueFrom(formData, "requestId");

  if (!validUuid(requestId)) {
    return errorState("This request could not be approved.");
  }

  const { supabase, userId } = await authenticatedClient();
  const { data: request } = await supabase
    .from("borrow_requests")
    .select("book_id")
    .eq("id", requestId)
    .eq("owner_id", userId)
    .maybeSingle();
  const { error } = await supabase.rpc("approve_borrow_request", {
    p_request_id: requestId,
  });

  if (error) {
    return errorState("This request could not be approved. It may no longer be pending.");
  }

  refreshWorkflowPages(request?.book_id);
  return { status: "success", message: "Request approved and the 21-day loan has started." };
}

export async function declineBorrowRequest(
  _previousState: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const requestId = valueFrom(formData, "requestId");

  if (!validUuid(requestId)) {
    return errorState("This request could not be declined.");
  }

  const { supabase, userId } = await authenticatedClient();
  const { data: request } = await supabase
    .from("borrow_requests")
    .select("book_id")
    .eq("id", requestId)
    .eq("owner_id", userId)
    .maybeSingle();
  const { error } = await supabase.rpc("decline_borrow_request", {
    p_request_id: requestId,
  });

  if (error) {
    return errorState("This request could not be declined. It may no longer be pending.");
  }

  refreshWorkflowPages(request?.book_id);
  return { status: "success", message: "Request declined." };
}

export async function cancelBorrowRequest(
  _previousState: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const requestId = valueFrom(formData, "requestId");

  if (!validUuid(requestId)) {
    return errorState("This request could not be cancelled.");
  }

  const { supabase, userId } = await authenticatedClient();
  const { data: request } = await supabase
    .from("borrow_requests")
    .select("book_id")
    .eq("id", requestId)
    .eq("requester_id", userId)
    .maybeSingle();
  const { error } = await supabase.rpc("cancel_borrow_request", {
    p_request_id: requestId,
  });

  if (error) {
    return errorState("This request could not be cancelled. It may no longer be pending.");
  }

  refreshWorkflowPages(request?.book_id);
  return { status: "success", message: "Request cancelled." };
}

export async function returnLoan(
  _previousState: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const loanId = valueFrom(formData, "loanId");

  if (!validUuid(loanId)) {
    return errorState("This loan could not be marked returned.");
  }

  const { supabase, userId } = await authenticatedClient();
  const { data: loan } = await supabase
    .from("loans")
    .select("book_id")
    .eq("id", loanId)
    .or(`owner_id.eq.${userId},borrower_id.eq.${userId}`)
    .maybeSingle();
  const { error } = await supabase.rpc("return_loan", {
    p_loan_id: loanId,
  });

  if (error) {
    return errorState("This loan could not be marked returned. It may already be closed.");
  }

  refreshWorkflowPages(loan?.book_id);
  return { status: "success", message: "The loan has been marked returned." };
}
