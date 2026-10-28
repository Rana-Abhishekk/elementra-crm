"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Demo-mode only: the demo users' shared password (02_REFERENCE_DATA §5)
const DEMO_PASSWORD = "Demo@1234";

export function LoginForm({ quickLogins = [] }: { quickLogins?: { label: string; who: string; email: string }[] }) {
  const router = useRouter();
  const callbackUrl = useSearchParams().get("callbackUrl") || "/dashboard";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(email: FormDataEntryValue | null, password: FormDataEntryValue | null) {
    setPending(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.error) return setError(res.error);
    router.push(callbackUrl);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await login(form.get("email"), form.get("password"));
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="email" type="email" placeholder="Email" required className="field" autoComplete="username" />
        <input name="password" type="password" placeholder="Password" required className="field" autoComplete="current-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="btn w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {quickLogins.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="mb-2 text-xs font-medium text-slate-500">Demo quick login</div>
          <div className="flex flex-wrap gap-2">
            {quickLogins.map((q) => (
              <button
                key={q.email}
                type="button"
                disabled={pending}
                onClick={() => login(q.email, DEMO_PASSWORD)}
                className="rounded-full border border-gold/50 bg-gold-light px-3 py-1 text-xs font-medium text-brand hover:bg-gold/30 disabled:opacity-60"
              >
                {q.label} <span className="text-slate-500">· {q.who}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
