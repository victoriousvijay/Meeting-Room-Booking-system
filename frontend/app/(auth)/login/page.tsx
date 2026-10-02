"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { useToast } from "@/components/Toast";
import { Avatar, Button, Field, cn, fieldBorder, inputClass } from "@/components/ui";
import { api, describeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { emailError, hasErrors, passwordError } from "@/lib/validation";

const DEMO_PEOPLE = [
  { account: DEMO_ACCOUNTS.admin, name: "Vijay Sharma", role: "Admin · sees everything" },
  { account: DEMO_ACCOUNTS.member, name: "Vidhi Agarwal", role: "Member · Engineering" },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const notify = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function logIn(credentials: { email: string; password: string }, source: string) {
    setSubmitting(source);
    try {
      const session = await api.login(credentials);
      signIn(session);
      notify({ kind: "success", title: "Welcome back", message: `Logged in to ${session.user.workspace.name}.` });
      router.replace("/dashboard");
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setSubmitting(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = { email: emailError(email), password: passwordError(password, { isNew: false }) };
    setErrors(found);
    if (!hasErrors(found)) logIn({ email, password }, "form");
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
      <p className="mt-2 text-sm text-white/50">Log in to book your next meeting in seconds.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Field label="Work email" error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((x) => ({ ...x, email: undefined }));
            }}
            className={cn(inputClass, fieldBorder(errors.email))}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(v) => {
              setPassword(v);
              setErrors((x) => ({ ...x, password: undefined }));
            }}
          />
        </Field>
        <Button type="submit" loading={submitting === "form"} disabled={submitting !== null} className="w-full py-3">
          Log in
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3 text-xs text-white/30">
        <span className="h-px flex-1 bg-white/10" />
        or explore the demo workspace
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid gap-2">
        {DEMO_PEOPLE.map(({ account, name, role }) => (
          <button
            key={account.email}
            type="button"
            disabled={submitting !== null}
            onClick={() => logIn({ email: account.email, password: account.password }, account.email)}
            className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-60"
          >
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{name}</p>
              <p className="text-xs text-white/40">{role}</p>
            </div>
            <ArrowRight
              className={cn(
                "size-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white",
                submitting === account.email && "animate-pulse text-white",
              )}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <p className="mt-8 text-sm text-white/50">
        New here?{" "}
        <Link href="/signup" className="font-medium text-white underline-offset-4 hover:underline">
          Create a workspace
        </Link>{" "}
        or{" "}
        <Link href="/join" className="font-medium text-white underline-offset-4 hover:underline">
          join your team
        </Link>
        .
      </p>
    </>
  );
}
