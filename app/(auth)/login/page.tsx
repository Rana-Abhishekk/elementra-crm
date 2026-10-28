import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Elementra CRM</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
