import Link from "next/link";
import { Building2, Handshake, LayoutDashboard, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/companies", label: "Companies", icon: Building2 },
  { href: "/dashboard/deals", label: "Deals", icon: Handshake },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-56 md:border-r md:border-b-0">
        <div className="px-4 py-4 text-lg font-semibold text-brand">Elementra</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-slate-100">
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 px-4 py-3 text-sm md:block">
          <div className="truncate font-medium">{user.name}</div>
          <div className="mb-2 truncate text-slate-500">{user.email}</div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
