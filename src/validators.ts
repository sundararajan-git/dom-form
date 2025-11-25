import type { ValidateFn } from "./types";

export const required: ValidateFn = (value) => {
  if (value === null) return "Required";
  if (typeof value === "string" && value.trim() === "") return "Required";
  if (value instanceof File && value.size === 0) return "Required";
  return null;
};
