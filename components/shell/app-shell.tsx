"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronsLeft, ChevronsRight, FlaskConical, LogOut, Menu, Plus, Search, UserRound, X } from "lucide-react";
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

// Sidebar sizes (px). Default is 20% wider than the old 240 px; the user can drag the edge.
const DEFAULT_WIDTH = 288;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const RAIL_WIDTH = 72;

// Each sidebar section gets its own icon colour
const GROUP_TONE: Record<string, string> = {
  Work: "text-sky-300",
  Insights: "text-amber-300",
  Customers: "text-emerald-300",
  Masters: "text-fuchsia-300",
  Admin: "text-slate-300",
};

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // private mode / storage blocked: preferences just aren't remembered
    }
  },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [rail, setRail] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [resizing, setResizing] = useState(false);
  const groups = navFor(user.permissions, demoMode);
  const has = (p: string) => user.permissions.includes(p);

  // Remembered layout (read after mount so server and client render the same first frame)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, store.get("sidebar.width", DEFAULT_WIDTH))));
    setRail(store.get("sidebar.rail", false));
    setClosedGroups(store.get("sidebar.closedGroups", {}));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Close the drawer after navigating
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const activeGroup = groups.find((g) => g.items.some((i) => isActive(i.href)));
  const activeItem = activeGroup?.items.find((i) => isActive(i.href));

  const toggleGroup = (title: string) =>
    setClosedGroups((g) => {
      const next = { ...g, [title]: !g[title] };
      store.set("sidebar.closedGroups", next);
      return next;
    });

  const toggleRail = () =>
    setRail((r) => {
      store.set("sidebar.rail", !r);
      return !r;
    });

  // Drag the sidebar's right edge to resize
  const startX = useRef(0);
  const startW = useRef(DEFAULT_WIDTH);
  useEffect(() => {
    if (!resizing) return;
    const move = (e: PointerEvent) => setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + e.clientX - startX.current)));
    const up = () => setResizing(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [resizing]);
  // Remember the width once the drag ends
  useEffect(() => {
    if (!resizing && width !== DEFAULT_WIDTH) store.set("sidebar.width", width);
  }, [resizing, width]);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = width;
    setResizing(true);
  };

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex justify-end px-3 pt-3 md:hidden">
        <button className="text-white/70" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className={cn("scrollbar-dark flex-1 overflow-y-auto pb-4", compact ? "space-y-3 px-2 pt-3" : "space-y-1 px-3 pt-3")}>
        {groups.map((g) => {
          // The group holding the current page always stays open
          const hasActive = g.items.some((i) => isActive(i.href));
          const collapsed = !compact && !!closedGroups[g.title] && !hasActive;
          return (
            <div key={g.title} className={compact ? "border-t border-white/10 pt-3 first:border-0 first:pt-0" : ""}>
              {!compact && (
                <button
                  onClick={() => toggleGroup(g.title)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs font-semibold tracking-wider text-white/50 uppercase hover:text-white/80"
                  aria-expanded={!collapsed}
                >
                  {g.title}
                  <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
                </button>
              )}
              {!collapsed && (
                <div className="space-y-0.5 pb-2">
                  {g.items.map(({ href, label, icon: Icon, feature }) => (
                    <Link
                      key={href}
                      href={href}
                      title={compact ? label : undefined}
                      className={cn(
                        "flex items-center rounded-md text-sm",
                        compact ? "justify-center p-2.5" : "gap-3 px-2.5 py-2.5",
                        isActive(href) ? "bg-brand font-medium text-white" : "text-white/80 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={cn("size-[18px] shrink-0", isActive(href) ? "text-white" : GROUP_TONE[g.title])} />
                      {!compact && <span className="truncate">{label}</span>}
                      {!compact && feature && <FeatureBadge feature={feature} className="ml-auto bg-white/10 text-[10px] text-white/80 ring-white/20" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className={cn("border-t border-white/10 py-3", compact ? "px-2" : "px-4")}>
        <div className={cn("flex items-center", compact ? "flex-col gap-2" : "justify-between")}>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-white/60 hover:text-white" title="Sign out">
            <LogOut className="size-4" /> {!compact && "Sign out"}
          </button>
          <button
            onClick={toggleRail}
            className="hidden rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white md:inline-flex"
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("flex min-h-screen flex-col", resizing && "cursor-col-resize select-none")}>
      {/* 7rem tall: the sidebar and sticky page bars sit just under it */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2 px-3 md:gap-6 md:px-5">
          <button className="btn-ghost px-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" title="Elementra Lead CRM">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-base font-semibold text-white">E</span>
            <span className="text-lg font-semibold text-ink">Elementra</span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 overflow-hidden lg:flex" aria-label="Sections">
            {groups.map((g) => (
              <Link
                key={g.title}
                href={g.items[0].href}
                className={cn("rounded-md px-3 py-1.5 text-sm whitespace-nowrap", g === activeGroup ? "bg-gold-light font-medium text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-ink")}
              >
                {g.title}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            {bell}
            <AccountMenu user={user} />
          </div>
        </div>
        <div className="flex h-14 items-center gap-3 px-3 md:px-5">
          {has("leads.create") && (
            <Link href="/dashboard/leads/new" className="btn shrink-0 px-3 py-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New lead</span>
            </Link>
          )}
          <span className="hidden w-56 shrink-0 truncate text-lg text-ink md:block">{activeItem?.label}</span>
          <form action="/dashboard/leads" className="relative min-w-0 flex-1 md:mx-auto md:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" placeholder="Search name, phone or EL-ref…" className="field py-1.5 pl-8" aria-label="Search leads" />
          </form>
          <span className="hidden w-56 shrink-0 xl:block" />
        </div>
      </header>
      <div className="flex min-w-0 flex-1">
        <aside className="sticky top-28 hidden h-[calc(100vh-7rem)] shrink-0 bg-sidebar md:block" style={{ width: rail ? RAIL_WIDTH : width }}>
          {sidebar(rail)}
          {!rail && (
            <div
              onPointerDown={startResize}
              onDoubleClick={() => {
                setWidth(DEFAULT_WIDTH);
                store.set("sidebar.width", DEFAULT_WIDTH);
              }}
              className={cn("absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize hover:bg-gold/40", resizing && "bg-gold/60")}
              role="separator"
              aria-orientation="vertical"
              aria-label="Drag to resize the sidebar (double-click to reset)"
              title="Drag to resize · double-click to reset"
            />
          )}
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-sidebar shadow-xl">{sidebar(false)}</aside>
        </div>
      )}
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

/** Avatar + name in the top bar; opens a small menu (My account, Sign out). */
function AccountMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={open} title="My account">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials(user.name)}</span>
        <span className="hidden text-left text-xs leading-tight lg:block">
          <span className="block font-medium text-ink">{user.name}</span>
          <span className="block text-slate-500">
            {user.roleName}
            {user.branchName ? ` · ${user.branchName}` : ""}
          </span>
        </span>
        <ChevronDown className="hidden size-3.5 text-slate-400 lg:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2 text-xs">
            <div className="font-medium text-ink">{user.name}</div>
            <div className="truncate text-slate-500">{user.email}</div>
          </div>
          <Link href="/dashboard/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
            <UserRound className="size-4" /> My account
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" role="menuitem">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
