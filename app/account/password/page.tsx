import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/app/dashboard/account/change-password-form";

export const dynamic = "force-dynamic";

// Shown on its own (no sidebar) when an admin set a temporary password
export default async function ForcedPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-2xl font-semibold tracking-[0.3em] text-white">ELEMENTRA</div>
        <div className="mt-1 text-xs tracking-widest text-gold uppercase">Lead CRM</div>
      </div>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <p className="mb-6 text-sm text-slate-500">
          {user.mustChangePassword ? "Your admin gave you a temporary password. Pick your own to continue." : "Change your password."}
        </p>
        <ChangePasswordForm requireCurrent={!user.mustChangePassword} redirectTo="/dashboard" />
      </div>
    </main>
  );
}
