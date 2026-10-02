"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Field, cn, fieldBorder, inputClass } from "@/components/ui";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emailError, hasErrors, passwordError, required } from "@/lib/validation";

const EMPTY = { workspace_name: "", name: "", email: "", password: "", department: "" };

export default function SignupPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = {
      workspace_name: required(form.workspace_name, "Name your workspace, e.g. your company."),
      name: required(form.name, "Enter your name."),
      email: emailError(form.email),
      password: passwordError(form.password, { isNew: true }),
    };
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      const session = await api.signup(form);
      signIn(session);
      notify({
        kind: "success",
        title: "Workspace created",
        message: `${session.user.workspace.name} is ready. Add your rooms to get started.`,
      });
      router.replace("/rooms");
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create your workspace</h1>
      <p className="mt-1 text-sm text-zinc-500">You&apos;ll be its admin and can invite your team next.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Company or team name" error={errors.workspace_name}>
          <input value={form.workspace_name} onChange={set("workspace_name")} className={cn(inputClass, fieldBorder(errors.workspace_name))} />
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
          <input value={form.department} onChange={set("department")} placeholder="e.g. Operations" className={cn(inputClass, "border-zinc-300")} />
        </Field>
        <Button type="submit" loading={submitting} className="w-full">
          Create workspace
        </Button>
      </form>

      <p className="mt-6 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
