"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  approveBorrowRequest,
  cancelBorrowRequest,
  declineBorrowRequest,
  returnLoan,
} from "@/app/actions/workflows";
import {
  initialWorkflowActionState,
  type WorkflowActionState,
} from "@/lib/workflow-state";

type WorkflowAction = (
  state: WorkflowActionState,
  formData: FormData,
) => Promise<WorkflowActionState>;

function ActionButton({ label, pendingLabel, tone = "primary" }: {
  label: string;
  pendingLabel: string;
  tone?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={tone === "primary" ? "auth-submit auth-submit--compact" : "workflow-button workflow-button--secondary"}
      type="submit"
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function WorkflowForm({
  action,
  fieldName,
  fieldValue,
  label,
  pendingLabel,
  tone,
}: {
  action: WorkflowAction;
  fieldName: "requestId" | "loanId";
  fieldValue: string;
  label: string;
  pendingLabel: string;
  tone?: "primary" | "secondary";
}) {
  const [state, formAction] = useActionState(action, initialWorkflowActionState);

  return (
    <form className="workflow-form" action={formAction}>
      <input type="hidden" name={fieldName} value={fieldValue} />
      <ActionButton label={label} pendingLabel={pendingLabel} tone={tone} />
      {state.message ? (
        <p
          className={`workflow-message workflow-message--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function OwnerRequestActions({ requestId }: { requestId: string }) {
  return (
    <div className="workflow-actions">
      <WorkflowForm
        action={approveBorrowRequest}
        fieldName="requestId"
        fieldValue={requestId}
        label="Approve"
        pendingLabel="Approving…"
      />
      <WorkflowForm
        action={declineBorrowRequest}
        fieldName="requestId"
        fieldValue={requestId}
        label="Decline"
        pendingLabel="Declining…"
        tone="secondary"
      />
    </div>
  );
}

export function CancelRequestAction({ requestId }: { requestId: string }) {
  return (
    <WorkflowForm
      action={cancelBorrowRequest}
      fieldName="requestId"
      fieldValue={requestId}
      label="Cancel request"
      pendingLabel="Cancelling…"
      tone="secondary"
    />
  );
}

export function ReturnLoanAction({ loanId }: { loanId: string }) {
  return (
    <WorkflowForm
      action={returnLoan}
      fieldName="loanId"
      fieldValue={loanId}
      label="Mark returned"
      pendingLabel="Updating…"
      tone="secondary"
    />
  );
}
