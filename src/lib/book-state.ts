export type BookActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<
    Record<
      "title" | "author" | "categoryId" | "publishedYear" | "isbn" | "description" | "condition" | "requestMessage",
      string
    >
  >;
  fieldValues?: Partial<
    Record<
      "title" | "author" | "categoryId" | "publishedYear" | "isbn" | "description" | "condition",
      string
    >
  >;
};

export const initialBookActionState: BookActionState = {
  status: "idle",
  message: "",
};
