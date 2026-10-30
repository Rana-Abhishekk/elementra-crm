"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FlaskConical, LogOut, Menu, Plus, Search, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { navFor } from "@/lib/nav";
import { FeatureBadge } from "@/components/feature-badge";
import { cn } from "@/lib/utils";

export interface ShellUser {
  name: string;
  email: string;
  roleName: string;
  branchName: string | null;
  permissions: string[];
}

export function AppShell({
  user,
  demoMode,
  bell,
  children,
}: {
  user: ShellUser;
  demoMode: boolean;
  bell?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = navFor(user.permissions, demoMode);
  const has = (p: string) => user.permissions.includes(p);

  // Close the drawer after navigating
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" className="leading-tight">
          <div className="text-lg font-semibold tracking-[0.2em] text-white">ELEMENTRA</div>
          <div className="text-[11px] tracking-wider text-gold uppercase">Lead CRM</div>
        </Link>
        <button className="text-white/70 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-2 pb-1 text-[11px] font-medium tracking-wider text-white/40 uppercase">{g.title}</div>
            {g.items.map(({ href, label, icon: Icon, feature }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                  isActive(href) ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive(href) && "text-gold")} />
                <span className="truncate">{label}</span>
                {feature && <FeatureBadge feature={feature} className="ml-auto bg-white/10 text-[10px] text-white/80 ring-white/20" />}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-sm">
        <div className="truncate font-medium text-white">{user.name}</div>
        <div className="truncate text-xs text-white/50">
          {user.roleName}
          {user.branchName ? ` · ${user.branchName}` : ""}
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <LogOut className="size-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-brand md:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:px-6">
          <button className="btn-ghost px-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <form action="/dashboard/leads" className="relative min-w-0 flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" placeholder="Search name, phone or EL-ref…" className="field py-1.5 pl-8" aria-label="Search leads" />
          </form>
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            {bell}
            {has("leads.create") && (
              <Link href="/dashboard/leads/new" className="btn px-3 py-1.5">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New lead</span>
              </Link>
            )}
            <Link href="/dashboard/account" className="hidden text-right text-xs leading-tight hover:underline lg:block" title="My account">
              <div className="font-medium text-ink">{user.name}</div>
              <div className="text-slate-500">
                {user.roleName}
                {user.branchName ? ` · ${user.branchName}` : ""}
              </div>
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
      {demoMode && has("demo.use") && !pathname.startsWith("/dashboard/demo") && (
        <Link
          href="/dashboard/demo"
          className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-brand shadow-lg hover:brightness-105"
        >
          <FlaskConical className="size-4" /> Demo
        </Link>
      )}
    </div>
  );
}
