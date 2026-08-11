export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<
    Record<"displayName" | "email" | "password" | "confirmPassword", string>
  >;
  fieldValues?: Partial<Record<"displayName" | "email", string>>;
};

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};
