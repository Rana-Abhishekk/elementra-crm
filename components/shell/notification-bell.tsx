"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { relativeTime } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import { markNotificationsRead } from "@/app/dashboard/notification-actions";

interface Item {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 15_000;
const MAX_TOASTS = 3;
const URGENT = new Set(["SLA_BREACH", "ESCALATION"]);

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number; items: Item[] };
      // First load just remembers what's there; afterwards new unread items pop a toast
      if (seen.current) {
        const fresh = data.items.filter((i) => !i.readAt && !seen.current!.has(i.id));
        // A rule run can create many at once — show a few, summarise the rest
        for (const n of fresh.slice(0, MAX_TOASTS).reverse()) {
          const show = URGENT.has(n.type) ? toast.warning : toast;
          show(n.title, { description: n.body ?? undefined, action: n.href ? { label: "Open", onClick: () => router.push(n.href!) } : undefined });
        }
        if (fresh.length > MAX_TOASTS) toast(`+${fresh.length - MAX_TOASTS} more notifications`, { description: "Open the bell to see them all." });
      }
      seen.current = new Set(data.items.map((i) => i.id));
      setUnread(data.unread);
      setItems(data.items);
    } catch {
      // offline / dev server restarting — try again next tick
    }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(poll, POLL_MS);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("elementra:poll", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("elementra:poll", onFocus);
    };
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function readAll() {
    await markNotificationsRead();
    setUnread(0);
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative px-2" aria-label={`Notifications (${unread} unread)`}>
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>}
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.href ?? "#"}
              onClick={() => {
                setOpen(false);
                if (!n.readAt) void markNotificationsRead([n.id]).then(poll);
              }}
              className={cn("block border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50", !n.readAt && "bg-gold-light/40")}
            >
              <div className="flex items-start gap-2">
                {!n.readAt && <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", URGENT.has(n.type) ? "bg-rose-500" : "bg-gold")} />}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{n.title}</div>
                  {n.body && <div className="text-xs text-slate-500">{n.body}</div>}
                  <div className="mt-0.5 text-[11px] text-slate-400">{relativeTime(n.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
