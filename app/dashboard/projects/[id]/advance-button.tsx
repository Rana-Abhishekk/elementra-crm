"use client";

import { ArrowRight } from "lucide-react";
import { useServerAction } from "@/lib/use-action";
import { advanceProjectAction } from "../actions";

export function AdvanceButton({ id, next }: { id: string; next: string }) {
  const { pending, run } = useServerAction();
  return (
    <button className="btn" disabled={pending} onClick={() => run(() => advanceProjectAction(id))}>
      Advance to “{next}” <ArrowRight className="size-4" />
    </button>
  );
}
