"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MastersTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  if (tabs.length < 2) return null;
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="flex w-max gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn("rounded-md px-3 py-1.5 text-sm whitespace-nowrap", pathname.startsWith(t.href) ? "bg-white font-medium text-ink shadow-sm" : "text-slate-600 hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
