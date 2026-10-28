"use client";

import { TriangleAlert } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-12 max-w-lg p-8 text-center">
      <TriangleAlert className="mx-auto size-8 text-amber-500" />
      <h2 className="mt-3 text-lg font-semibold">Something went wrong on this page</h2>
      <p className="mt-1 text-sm text-slate-500">
        {error.message === "Unauthorized" || error.message.startsWith("You don't have access")
          ? "You don't have access to this page with your current role."
          : "The rest of the app is fine. Try again, or go back to the dashboard."}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button className="btn" onClick={reset}>Try again</button>
        <a className="btn-secondary" href="/dashboard">Dashboard</a>
      </div>
    </div>
  );
}
