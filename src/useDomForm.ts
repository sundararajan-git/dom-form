import { useRef, useCallback } from "react";
import type { RegisterOptions } from "./types";
import { deepGet, deepSet, formDataToObject, isInputElement } from "./utils";
import { requiredValidator } from "./utils";


type FieldMeta = {
    name: string;
    options?: RegisterOptions;
};

type FormScope = {
    fields: Record<string, FieldMeta>;
    values: Record<string, any>;
    errors: Record<string, string | null>;
    element: HTMLFormElement | null;
};

type Store = {
    scopes: Record<string, FormScope>;
};




function generateFormId() {
    return `form-${Math.random().toString(36).slice(2)}`;
}

export function useDomForm() {
    const store = useRef<Store>({ scopes: {} });
    const delegated = useRef<WeakSet<HTMLFormElement>>(new WeakSet()).current;

    const ensureScope = (formId: string) => {
        if (!store.current.scopes[formId]) {
            store.current.scopes[formId] = {
                fields: {},
                values: {},
                errors: {},
                element: null,
            };
        }
        return store.current.scopes[formId];
    };

    const ensureFormIdFor = (form: HTMLFormElement) => {
        let id = form.getAttribute("data-form-id") || form.id;
        if (!id) {
            id = generateFormId();
            form.setAttribute("data-form-id", id);
        }
        const scope = ensureScope(id);
        scope.element = form;
        return id;
    };

    const register = useCallback((name: string, options?: RegisterOptions) => {
        const ref = (el: HTMLElement | null) => {
            if (!el) return;
            const form = el.closest("form") as HTMLFormElement | null;
            if (!form) return;

            const formId = ensureFormIdFor(form);
            const scope = ensureScope(formId);

            scope.fields[name] = { name, options };

            if (isInputElement(el)) {
                if (el instanceof HTMLInputElement && el.type === "file") {
                    deepSet(scope.values, name, (el as HTMLInputElement).files);
                } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
                    const arr = deepGet(scope.values, name) || [];
                    if (el.checked) {
                        if (!arr.includes(el.value)) {
                            deepSet(scope.values, name, [...arr, el.value]);
                        } else {
                            deepSet(scope.values, name, arr);
                        }
                    } else {
                        deepSet(scope.values, name, arr);
                    }
                } else if (el instanceof HTMLInputElement && el.type === "radio") {
                    if (el.checked) {
                        deepSet(scope.values, name, el.value);
                    } else {
                        const existing = deepGet(scope.values, name);
                        if (existing === undefined) deepSet(scope.values, name, undefined);
                    }
                } else {
                    deepSet(scope.values, name, (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
                }
            }
        };

        return { name, ref };
    }, []);

    const attachDelegation = useCallback((form: HTMLFormElement) => {
        if (!form) return;
        const formId = ensureFormIdFor(form);
        const scope = ensureScope(formId);

        if (delegated.has(form)) return;

        const onInput = (e: Event) => {
            const target = e.target as Element | null;
            if (!target) return;

            const input = target.closest("[name]") as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement
                | null;
            if (!input || !isInputElement(input)) return;

            const name = (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name;
            if (!name) return;

            if (!scope.fields[name]) scope.fields[name] = { name };

            if (input instanceof HTMLInputElement && input.type === "file") {
                deepSet(scope.values, name, input.files);
            } else if (input instanceof HTMLInputElement && input.type === "checkbox") {
                const arr = (deepGet(scope.values, name) as any[]) || [];
                if (input.checked) {
                    if (!arr.includes(input.value)) {
                        deepSet(scope.values, name, [...arr, input.value]);
                    }
                } else {
                    deepSet(scope.values, name, arr.filter((v: any) => v !== input.value));
                }
            } else if (input instanceof HTMLInputElement && input.type === "radio") {
                if (input.checked) deepSet(scope.values, name, input.value);
            } else {
                deepSet(scope.values, name, (input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
            }
        };

        const onBlur = (e: Event) => {
            const target = e.target as Element | null;
            if (!target) return;
            const input = target.closest("[name]") as
                | HTMLInputElement
                | HTMLTextAreaElement
                | HTMLSelectElement
                | null;
            if (!input || !isInputElement(input)) return;
            validateFieldScoped(formId, input.name);
        };

        form.addEventListener("input", onInput);
        form.addEventListener("change", onInput);
        form.addEventListener("blur", onBlur, true);

        form.querySelectorAll("[name]").forEach((el) => {
            if (!isInputElement(el)) return;
            const name = (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name;
            if (!scope.fields[name]) {
                scope.fields[name] = { name };
            }
            if (el instanceof HTMLInputElement && el.type === "file") {
                deepSet(scope.values, name, el.files);
            } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
                const arr = deepGet(scope.values, name) || [];
                if (el.checked) deepSet(scope.values, name, [...arr, el.value]);
                else deepSet(scope.values, name, arr);
            } else if (el instanceof HTMLInputElement && el.type === "radio") {
                if (el.checked) deepSet(scope.values, name, el.value);
            } else {
                deepSet(scope.values, name, (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value);
            }
        });

        delegated.add(form);
    }, [delegated]);

    const validateFieldScoped = (formId: string, name: string) => {
        const scope = store.current.scopes[formId];
        if (!scope) return null;
        const meta = scope.fields[name];
        if (!meta) return null;

        let value: any;
        if (deepGet(scope.values, name) !== undefined) {
            value = deepGet(scope.values, name);
        } else if (scope.element) {
            const fd = new FormData(scope.element);
            value = fd.get(name);
        } else {
            value = undefined;
        }

        const opts = meta.options;
        let error: string | null = null;

        if (opts?.required) {
            const rv = requiredValidator(value, scope.element ?? undefined);
            if (rv) error = typeof opts.required === "string" ? opts.required : rv;
        }

        if (!error && opts?.validate) {
            const fns = Array.isArray(opts.validate) ? opts.validate : [opts.validate];
            for (const fn of fns) {
                const err = fn(value, scope.element ?? undefined);
                if (err) {
                    error = err;
                    break;
                }
            }
        }

        scope.errors[name] = error ?? null;

        if (scope.element) {
            const elements = scope.element.querySelectorAll(`[name="${name}"]`);
            elements.forEach((el) => {
                if (isInputElement(el)) {
                    if (error) el.classList.add("border-red-500");
                    else el.classList.remove("border-red-500");
                }
            });
        }

        return error;
    };

    const validateFormScoped = (form: HTMLFormElement) => {
        const id = form.getAttribute("data-form-id") || form.id || null;
        if (!id) return false;
        const scope = store.current.scopes[id];
        if (!scope) return true;

        const namesFromMeta = Object.keys(scope.fields);
        const namesFromDOM = Array.from(form.querySelectorAll("[name]")).map((el) => (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name);
        const allNames = Array.from(new Set([...namesFromMeta, ...namesFromDOM]));

        const errors: Record<string, string | null> = {};
        for (const name of allNames) {
            const err = validateFieldScoped(id, name);
            if (err) errors[name] = err;
        }

        return Object.keys(errors).length === 0 && Object.values(errors).every((v) => v === null);
    };

    const getValues = (form?: HTMLFormElement) => {
        if (!form) {
            const map: Record<string, Record<string, any>> = {};
            Object.entries(store.current.scopes).forEach(([fid, s]) => {
                map[fid] = structuredClone(s.values);
            });
            return map;
        }
        const id = form.getAttribute("data-form-id") || form.id || null;
        if (!id) return {};
        const scope = store.current.scopes[id];
        if (scope) return structuredClone(scope.values);
        const fd = new FormData(form);
        return formDataToObject(fd);
    };

    const setValue = (form: HTMLFormElement | string, name: string, value: any) => {
        let fid: string | null = null;
        let scope: FormScope | undefined;
        if (typeof form === "string") {
            fid = form;
            scope = store.current.scopes[fid];
        } else if (form instanceof HTMLFormElement) {
            fid = form.getAttribute("data-form-id") || form.id || null;
            if (!fid) fid = ensureFormIdFor(form);
            scope = ensureScope(fid);
        }
        if (!scope || !fid) return;

        deepSet(scope.values, name, value);

        if (scope.element) {
            const el = scope.element.querySelector(`[name="${name}"]`);
            if (el && isInputElement(el)) {
                if (el instanceof HTMLInputElement && el.type !== "file") {
                    (el as HTMLInputElement).value = value ?? "";
                } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
                    (el as any).value = value ?? "";
                }
            }
        }
    };

    const reset = (form?: HTMLFormElement) => {
        if (!form) {
            Object.values(store.current.scopes).forEach((s) => {
                if (s.element) reset(s.element);
            });
            return;
        }
        const id = form.getAttribute("data-form-id") || form.id || null;
        if (!id) return;
        const scope = store.current.scopes[id];
        if (!scope) return;

        form.reset();

        Object.keys(scope.fields).forEach((name) => {
            scope.values = {};
            scope.errors[name] = null;
        });

        const inputs = form.querySelectorAll("[name]");
        inputs.forEach((el) => {
            if (isInputElement(el)) el.classList.remove("border-red-500");
        });

        attachDelegation(form);
    };

    const handleSubmit = (form: HTMLFormElement, cb: (data: any) => void, onError?: (err: any) => void) => {
        if (!form) throw new Error("handleSubmit requires form element");

        attachDelegation(form);

        return async (e?: Event) => {
            if (e && typeof (e as Event).preventDefault === "function") (e as Event).preventDefault();

            const ok = validateFormScoped(form);
            if (!ok) {
                const id = form.getAttribute("data-form-id") || form.id || null;
                if (id && store.current.scopes[id]) onError?.(store.current.scopes[id].errors);
                else onError?.({});
                return;
            }

            const fd = new FormData(form);
            const obj = formDataToObject(fd);

            const id = form.getAttribute("data-form-id") || form.id || null;
            if (id && store.current.scopes[id]) {
                const merged = structuredClone(obj);
                const scopeVals = store.current.scopes[id].values;
                const iter = (o: any, prefix = "") => {
                    if (typeof o !== "object" || o === null) {
                        deepSet(merged, prefix, o);
                        return;
                    }
                    if (Array.isArray(o)) {
                        deepSet(merged, prefix, o);
                        return;
                    }
                    Object.keys(o).forEach((k) => {
                        const path = prefix ? `${prefix}.${k}` : `${k}`;
                        iter(o[k], path);
                    });
                };
                iter(scopeVals);
                cb(merged);
                return;
            }

            cb(obj);
        };
    };

    const registerFormElement = (form: HTMLFormElement) => {
        attachDelegation(form);
        const id = form.getAttribute("data-form-id") || form.id || null;
        if (id) {
            const s = ensureScope(id);
            s.element = form;
        }
    };

    const validateField = (name: string, form?: HTMLFormElement | null) => {
        if (!form) return null;
        const id = form.getAttribute("data-form-id") || form.id || null;
        if (!id) return null;
        return validateFieldScoped(id, name);
    };

    const getErrors = (form?: HTMLFormElement) => {
        if (!form) {
            const map: Record<string, Record<string, string | null>> = {};
            Object.entries(store.current.scopes).forEach(([fid, s]) => {
                map[fid] = { ...s.errors };
            });
            return map;
        }
        const id = form.getAttribute("data-form-id") || form.id || null;
        if (!id) return {};
        return { ...(store.current.scopes[id]?.errors ?? {}) };
    };

    return {
        register,
        registerFormElement,
        handleSubmit,
        getValues,
        setValue,
        reset,
        validateField,
        getErrors,
        // _store: store.current,
    };
}
