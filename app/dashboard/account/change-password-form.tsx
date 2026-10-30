"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changeOwnPasswordAction } from "./actions";

export function ChangePasswordForm({ requireCurrent = true, redirectTo }: { requireCurrent?: boolean; redirectTo?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    start(async () => {
      const res = await changeOwnPasswordAction({ current: String(f.get("current") ?? ""), next: String(f.get("next")), confirm: String(f.get("confirm")) });
      if (!res.ok) return setError(res.error);
      setError("");
      form.reset();
      toast.success(res.message ?? "Saved");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {requireCurrent && <input name="current" type="password" placeholder="Current password" required className="field" autoComplete="current-password" />}
      <input name="next" type="password" placeholder="New password" required className="field" autoComplete="new-password" />
      <input name="confirm" type="password" placeholder="Repeat new password" required className="field" autoComplete="new-password" />
      <p className="text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
