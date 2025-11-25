# 📦 dom-form

A lightweight, DOM-first form library for React and Vanilla JS.
Supports nested fields, arrays, validation, files, checkboxes, radios — without heavy state or re-renders.

---

## 🚀 Installation

```bash
npm install dom-form
```

---

## ⚡ Quick Start (React Example)

```tsx
import { useDomForm } from "dom-form";

const MyForm = () => {
  const { register, registerFormElement, handleSubmit, getErrors } =
    useDomForm();
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (formRef.current) registerFormElement(formRef.current);
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(
      formRef.current!,
      (data) => console.log("DATA:", data),
      (errors) => console.log("ERRORS:", errors)
    )(e.nativeEvent);
  };

  const errors = formRef.current ? getErrors(formRef.current) : {};

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input {...register("username", { required: true })} />
      {errors.username && <p>{errors.username}</p>}
      <button>Submit</button>
    </form>
  );
};
```

---

## ✨ Features

- ✔ DOM-first form system
- ✔ Works with **React or Vanilla JS**
- ✔ **Nested fields** (`address.city`)
- ✔ **Array fields** (`hobbies.0.value`)
- ✔ Checkbox & radio groups
- ✔ File inputs
- ✔ Required + custom validators
- ✔ Form-level + field-level validation
- ✔ Simple API with no re-render spam
- ✔ Tiny & dependency-free
- ✔ TypeScript support

---

## 📘 API Overview

### `register(name, options?)`

Attach to any input/select/textarea:

```tsx
<input {...register("email", { required: true })} />
```

Supports:

```ts
type RegisterOptions = {
  required?: boolean | string;
  validate?: ValidatorFn | ValidatorFn[];
};
```

Custom validator:

```ts
validate: (value) => (value.length < 3 ? "Too short" : null);
```

---

### `registerFormElement(form)`

Registers the `<form>` and sets up DOM event delegation.

```tsx
useEffect(() => {
  if (formRef.current) registerFormElement(formRef.current);
}, []);
```

---

### `handleSubmit(form, onSuccess, onError?)`

```tsx
handleSubmit(
  formRef.current!,
  (data) => console.log(data),
  (errors) => console.log(errors)
);
```

---

### `getErrors(form)`

```tsx
const errors = getErrors(formRef.current);
```

---

### `validateField(name, form)`

```tsx
validateField("email", formRef.current);
```

---

### `getValues(form)`

```ts
const values = getValues(formRef.current);
```

---

### `setValue(form, name, value)`

```ts
setValue(formRef.current!, "username", "John Doe");
```

---

### `reset(form)`

```ts
reset(formRef.current);
```

---

## 🧪 Live Validation (Optional)

```tsx
const [errors, setErrors] = useState({});

const onInput = () => {
  if (formRef.current) {
    setErrors(getErrors(formRef.current));
  }
};

<form ref={formRef} onInput={onInput}>
  ...
</form>;
```

---

## 📄 Full Example

```tsx
<form ref={formRef} onSubmit={submitHandler} onInput={onInput}>
  <input {...register("username", { required: "Username required" })} />
  {errors.username && <span>{errors.username}</span>}

  <input
    type="password"
    {...register("password", {
      required: true,
      validate: [
        (v) => (!v ? "Required" : null),
        (v) => (v.toString().length < 6 ? "Min 6 chars" : null),
        (v) => (!/[A-Z]/.test(v) ? "Needs uppercase" : null),
      ],
    })}
  />
  {errors.password && <span>{errors.password}</span>}

  <select {...register("address.country", { required: true })}>
    <option value="">Select</option>
    <option value="usa">USA</option>
    <option value="india">India</option>
  </select>

  <button>Submit</button>
</form>
```

---

## 🗂 Nested Output Example

Input names:

```
user.name
user.age
address.city
address.country
```

Result:

```json
{
  "user": {
    "name": "John",
    "age": "25"
  },
  "address": {
    "city": "New York",
    "country": "USA"
  }
}
```

---

## 🧩 Supports Arrays

```
hobbies.0.value
hobbies.1.value
```

Output:

```json
{
  "hobbies": [{ "value": "Gaming" }, { "value": "Coding" }]
}
```

---

## 📦 File Inputs

```tsx
<input type="file" {...register("avatar")} />
```

Value:

```
avatar: FileList
```

---

## 📝 License

MIT License — free for personal & commercial use.

---

## ⭐ Support

If this library saves you time, please give it a ⭐ on GitHub and npm!
