"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { useToast } from "@/components/Toast";
import { Button, Field, cn, fieldBorder, inputClass } from "@/components/ui";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emailError, hasErrors, passwordError, required } from "@/lib/validation";

const EMPTY = { workspace_name: "", name: "", email: "", password: "", department: "" };
type Form = typeof EMPTY;

export default function SignupPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof Form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
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
      <h1 className="text-3xl font-semibold tracking-tight text-white">Create your workspace</h1>
      <p className="mt-2 text-sm text-white/50">You&apos;ll be its admin, and can invite your team next.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Field label="Company or team name" error={errors.workspace_name}>
          <input
            placeholder="e.g. Acme Technologies"
            value={form.workspace_name}
            onChange={(e) => set("workspace_name")(e.target.value)}
            className={cn(inputClass, fieldBorder(errors.workspace_name))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" error={errors.name}>
            <input
              autoComplete="name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              className={cn(inputClass, fieldBorder(errors.name))}
            />
          </Field>
          <Field label="Department (optional)">
            <input
              placeholder="e.g. Operations"
              value={form.department}
              onChange={(e) => set("department")(e.target.value)}
              className={cn(inputClass, "border-white/10")}
            />
          </Field>
        </div>
        <Field label="Work email" error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            className={cn(inputClass, fieldBorder(errors.email))}
          />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          <PasswordInput
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={set("password")}
          />
        </Field>
        <Button type="submit" loading={submitting} className="w-full py-3">
          Create workspace
        </Button>
      </form>

      <p className="mt-8 text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-white underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
