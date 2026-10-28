"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { Modal } from "@/components/modal";
import { resetDemoAction } from "./actions";

export function ResetDemo() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} className="card flex items-start gap-3 border-rose-200 p-4 text-left hover:border-rose-400">
        <RotateCcw className="mt-0.5 size-5 shrink-0 text-rose-500" />
        <span>
          <span className="block font-medium text-ink">Reset demo data</span>
          <span className="block text-xs text-slate-500">Deletes all leads, tasks, messages and notifications, then regenerates the 75-day history</span>
        </span>
      </button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Reset demo data?">
        <p className="text-sm text-slate-600">All leads, activities, tasks, visits, messages, notifications, projects and audit entries are replaced with fresh synthetic data. Users, branches, the locality map, templates and settings stay.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            className="btn bg-rose-600 hover:bg-rose-700"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await resetDemoAction();
                setOpen(false);
                if (res.ok) toast.success(res.message);
                else toast.error(res.error);
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Reset now
          </button>
        </div>
      </Modal>
    </>
  );
}
