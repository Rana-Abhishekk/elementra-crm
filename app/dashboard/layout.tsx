import { redirect } from "next/navigation";
import { getCurrentUser, isDemoMode } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell/app-shell";
import { NotificationBell } from "@/components/shell/notification-bell";
import { getSessionUserId } from "@/lib/auth/options";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    // A valid cookie but no active user → the account was deactivated (or deleted) since sign-in
    redirect((await getSessionUserId()) ? "/login?reason=deactivated" : "/login");
  }
  // Temporary password set by an admin → choose a new one before anything else
  if (user.mustChangePassword) redirect("/account/password");
  const branch = user.branchId ? await prisma.branch.findUnique({ where: { id: user.branchId }, select: { name: true } }) : null;

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        roleName: user.roleName,
        branchName: branch?.name.replace(" Experience Centre", "") ?? null,
        permissions: user.permissions,
      }}
      demoMode={isDemoMode()}
      bell={<NotificationBell />}
    >
      {children}
    </AppShell>
  );
}
