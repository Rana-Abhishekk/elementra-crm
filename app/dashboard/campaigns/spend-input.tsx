"use client";

import { useState } from "react";
import { useServerAction } from "@/lib/use-action";
import { saveCampaignSpendAction } from "./actions";

export function SpendInput({ campaign, value }: { campaign: string; value: number }) {
  const { pending, run } = useServerAction();
  const [v, setV] = useState(value ? String(value) : "");
  return (
    <input
      className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right text-sm"
      inputMode="numeric"
      placeholder="₹"
      value={v}
      disabled={pending}
      onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
      onBlur={() => String(value || "") !== v && run(() => saveCampaignSpendAction(campaign, v))}
      aria-label={`Spend for ${campaign}`}
    />
  );
}
