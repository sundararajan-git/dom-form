
export function parsePath(path: string): Array<string | number> {
  const parts: Array<string | number> = [];
  let buffer = "";
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === ".") {
      if (buffer.length) {
        parts.push(convertKey(buffer));
        buffer = "";
      }
      continue;
    }
    if (ch === "[") {
      if (buffer.length) {
        parts.push(convertKey(buffer));
        buffer = "";
      }
      let j = i + 1;
      let inner = "";
      let quoted = false;
      if (path[j] === "'" || path[j] === '"') {
        quoted = true;
        const quoteChar = path[j];
        j++;
        while (j < path.length && path[j] !== quoteChar) {
          inner += path[j++];
        }
        j++;
      } else {
        while (j < path.length && path[j] !== "]") {
          inner += path[j++];
        }
      }
      i = j;
      if (inner.length) {
        parts.push(convertKey(inner));
      }
      continue;
    }
    buffer += ch;
  }
  if (buffer.length) {
    parts.push(convertKey(buffer));
  }
  return parts;
}

export function convertKey(k: string): string | number {
  if (/^\d+$/.test(k)) return Number(k);
  return k;
}

export function deepSet(obj: any, path: string, value: any) {
  const keys = parsePath(path);
  let cur = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const isLast = i === keys.length - 1;
    if (isLast) {
      cur[key as any] = value;
      return;
    }
    const nextKey = keys[i + 1];
    if (typeof nextKey === "number") {
      if (!Array.isArray(cur[key as any])) cur[key as any] = [];
    } else {
      if (!cur[key as any] || typeof cur[key as any] !== "object") cur[key as any] = {};
    }
    cur = cur[key as any];
  }
}

export function deepGet(obj: any, path: string) {
  const keys = parsePath(path);
  let cur = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[key as any];
  }
  return cur;
}

export function formDataToObject(fd: FormData) {
  const out: any = {};
  fd.forEach((value, key) => {
    const existing = deepGet(out, key);
    if (existing === undefined) {
      deepSet(out, key, value instanceof File ? value : (value as FormDataEntryValue));
    } else {
      if (!Array.isArray(existing)) {
        // replace existing with array
        const parent = getParentAndKey(out, key);
        if (parent) {
          parent.parent[parent.key] = [existing, value];
        }
      } else {
        const parent = getParentAndKey(out, key);
        if (parent) parent.parent[parent.key].push(value);
      }
    }
  });
  return out;
}

export function getParentAndKey(root: any, path: string) {
  const keys = parsePath(path);
  if (keys.length === 0) return null;
  const last = keys[keys.length - 1];
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i] as any];
    if (!cur) return null;
  }
  return { parent: cur, key: last as any };
}

export function isInputElement(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function requiredValidator(value: any, form?: HTMLFormElement | null) {
  if (value instanceof FileList) return value.length ? null : "This field is required";
  if (value === undefined || value === null) return "This field is required";
  if (typeof value === "string" && value.trim() === "") return "This field is required";
  if (Array.isArray(value) && value.length === 0) return "This field is required";
  if (false) {
    console.log(form)
  }
  return null;
}
