"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Field, cn, fieldBorder, inputClass } from "@/components/ui";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emailError, hasErrors, passwordError, required } from "@/lib/validation";

type Form = { join_code: string; name: string; email: string; password: string; department: string };

function JoinForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  // Invite links look like /join?code=ABCD2345, so the code can be pre-filled.
  const params = useSearchParams();
  const [form, setForm] = useState<Form>({
    join_code: params.get("code") ?? "",
    name: "",
    email: "",
    password: "",
    department: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = {
      join_code: required(form.join_code, "Enter the code your admin shared."),
      name: required(form.name, "Enter your name."),
      email: emailError(form.email),
      password: passwordError(form.password, { isNew: true }),
    };
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      const session = await api.join(form);
      signIn(session);
      notify({ kind: "success", title: "You're in", message: `Welcome to ${session.user.workspace.name}.` });
      router.replace("/dashboard");
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <Field label="Join code" error={errors.join_code}>
        <input
          value={form.join_code}
          onChange={set("join_code")}
          placeholder="e.g. NIMBUS26"
          className={cn(inputClass, "font-mono uppercase tracking-widest", fieldBorder(errors.join_code))}
        />
      </Field>
      <Field label="Your name" error={errors.name}>
        <input autoComplete="name" value={form.name} onChange={set("name")} className={cn(inputClass, fieldBorder(errors.name))} />
      </Field>
      <Field label="Work email" error={errors.email}>
        <input type="email" autoComplete="email" value={form.email} onChange={set("email")} className={cn(inputClass, fieldBorder(errors.email))} />
      </Field>
      <Field label="Password" error={errors.password} hint="At least 8 characters.">
        <input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} className={cn(inputClass, fieldBorder(errors.password))} />
      </Field>
      <Field label="Department (optional)">
        <input value={form.department} onChange={set("department")} placeholder="e.g. Engineering" className={cn(inputClass, "border-zinc-300")} />
      </Field>
      <Button type="submit" loading={submitting} className="w-full">
        Join workspace
      </Button>
    </form>
  );
}

export default function JoinPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Join your team</h1>
      <p className="mt-1 text-sm text-zinc-500">Use the join code from your workspace admin.</p>
      {/* useSearchParams needs a Suspense boundary so the page can still be pre-rendered. */}
      <Suspense>
        <JoinForm />
      </Suspense>
      <p className="mt-6 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
