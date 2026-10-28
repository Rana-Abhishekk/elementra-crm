import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getOptionalUser();
  if (!sessionUser) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, role: true, branch: { select: { name: true } } },
  });
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role, branchName: user.branch?.name.replace(" Experience Centre", "") ?? null }}
      demoMode={isDemoMode()}
    >
      {children}
    </AppShell>
  );
}
