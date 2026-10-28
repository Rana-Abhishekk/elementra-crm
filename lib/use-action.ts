"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type Res = { ok: true; message?: string } | { ok: false; error: string };

/** Runs a server action in a transition, toasts the result and refreshes the page on success. */
export function useServerAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>, onOk?: (res: Res & { ok: true }) => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast.success(res.message);
        onOk?.(res);
        router.refresh();
      } else toast.error(res.error);
    });
  return { pending, run };
}
