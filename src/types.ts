
export type ValidateFn = (value: any, form?: HTMLFormElement | null) => string | null | undefined;

export type RegisterOptions = {
  required?: boolean | string;
  validate?: ValidateFn | ValidateFn[];
};
