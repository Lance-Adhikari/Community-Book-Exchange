export type WorkflowActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialWorkflowActionState: WorkflowActionState = {
  status: "idle",
  message: "",
};
