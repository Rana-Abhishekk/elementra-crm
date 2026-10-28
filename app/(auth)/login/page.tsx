import { Suspense } from "react";
import { isDemoMode } from "@/lib/access";
import { QUICK_LOGINS } from "@/lib/demo/reference";
import { LoginForm } from "./login-form";

// Reads DEMO_MODE at request time (quick-login chips), so the flag works without a rebuild
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const demo = isDemoMode();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-2xl font-semibold tracking-[0.3em] text-white">ELEMENTRA</div>
        <div className="mt-1 text-xs tracking-widest text-gold uppercase">Lead CRM</div>
      </div>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">Use your Elementra work email.</p>
        <Suspense>
          <LoginForm quickLogins={demo ? QUICK_LOGINS : []} />
        </Suspense>
      </div>
    </main>
  );
}
