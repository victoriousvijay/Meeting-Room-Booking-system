"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
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

  const set = (key: keyof Form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
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
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      <Field label="Join code" error={errors.join_code}>
        <input
          value={form.join_code}
          onChange={(e) => set("join_code")(e.target.value)}
          placeholder="NIMBUS26"
          className={cn(
            inputClass,
            "text-center font-mono text-lg uppercase tracking-[0.35em]",
            fieldBorder(errors.join_code),
          )}
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
            placeholder="e.g. Engineering"
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
        Join workspace
      </Button>
    </form>
  );
}

export default function JoinPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Join your team</h1>
      <p className="mt-2 text-sm text-white/50">Use the join code your workspace admin shared with you.</p>
      {/* useSearchParams needs a Suspense boundary so the page can still be pre-rendered. */}
      <Suspense>
        <JoinForm />
      </Suspense>
      <p className="mt-8 text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-white underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
