"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Button, Field, cn, fieldBorder, inputClass } from "@/components/ui";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { emailError, hasErrors, passwordError } from "@/lib/validation";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function logIn(credentials: { email: string; password: string }) {
    setSubmitting(true);
    try {
      const session = await api.login(credentials);
      signIn(session);
      notify({ kind: "success", title: "Welcome back", message: `Logged in to ${session.user.workspace.name}.` });
      router.replace("/dashboard");
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = { email: emailError(email), password: passwordError(password, { isNew: false }) };
    setErrors(found);
    if (!hasErrors(found)) logIn({ email, password });
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Log in</h1>
      <p className="mt-1 text-sm text-zinc-500">Welcome back. Book your next meeting in seconds.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Work email" error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(inputClass, fieldBorder(errors.email))}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputClass, fieldBorder(errors.password))}
          />
        </Field>
        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-zinc-300 p-4">
        <p className="text-sm font-medium text-zinc-800">Just looking around?</p>
        <p className="mt-0.5 text-xs text-zinc-500">Explore the demo workspace, Nimbus Technologies.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.values(DEMO_ACCOUNTS).map((account) => (
            <Button
              key={account.email}
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={() => logIn({ email: account.email, password: account.password })}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-zinc-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
          Create a workspace
        </Link>{" "}
        or{" "}
        <Link href="/join" className="font-medium text-indigo-600 hover:underline">
          join your team
        </Link>
        .
      </p>
    </>
  );
}
