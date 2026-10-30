import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/auth";
import { leadWhere } from "@/lib/auth/scope";
import { progressSimulatedMessages } from "@/lib/data/messages";
import { FeatureBadge } from "@/components/feature-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { Ticks } from "@/components/ticks";
import { formatPhone } from "@/lib/domain/phone";
import { formatIST, relativeTime } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import { InboxComposer } from "./inbox-composer";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const user = await requireUser();
  const selectedId = (await searchParams).lead;
  await progressSimulatedMessages({ createdAt: { gte: new Date(new Date().getTime() - 3600_000) } });

  const scope = leadWhere(user);
  const convos = await prisma.lead.findMany({
    where: { AND: [scope, { messages: { some: {} } }] },
    select: {
      id: true,
      refCode: true,
      firstName: true,
      lastName: true,
      phoneE164: true,
      language: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true, status: true, direction: true } },
    },
    orderBy: { lastActivityAt: "desc" },
    take: 60,
  });
  convos.sort((a, b) => (b.messages[0]?.createdAt.getTime() ?? 0) - (a.messages[0]?.createdAt.getTime() ?? 0));
  const selected = convos.find((c) => c.id === selectedId) ?? (selectedId ? null : convos[0]);
  const [thread, templates] = selected
    ? await Promise.all([
        prisma.outboundMessage.findMany({ where: { leadId: selected.id }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, status: true, direction: true, templateCode: true, language: true, sentById: true } }),
        prisma.messageTemplate.findMany({ select: { code: true, language: true, name: true }, orderBy: [{ code: "asc" }, { language: "asc" }] }),
      ])
    : [[], []];
  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="WhatsApp inbox"
        badge={
          <>
            <FeatureBadge feature="F22" />
            <FeatureBadge feature="F24" />
          </>
        }
        description="Template messages go through the simulator — nothing reaches real phones until your WhatsApp Business number is approved by Meta. Two-way chat is in progress."
      />
      {convos.length === 0 ? (
        <div className="card">
          <EmptyState icon={MessageCircle} title="No conversations yet">
            Welcome messages are sent automatically when a lead arrives. Run a demo scenario to see one here.
          </EmptyState>
        </div>
      ) : (
        <div className="card grid min-h-[70vh] overflow-hidden md:grid-cols-[300px_1fr]">
          <div className={cn("border-r border-slate-100", selectedId && "hidden md:block")}>
            {convos.map((c) => {
              const last = c.messages[0];
              return (
                <Link
                  key={c.id}
                  href={`?lead=${c.id}`}
                  className={cn("block border-b border-slate-50 px-4 py-3 hover:bg-slate-50", selected?.id === c.id && "bg-gold-light/50")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{last ? relativeTime(last.createdAt, now) : ""}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate text-xs text-slate-500">
                    {last?.direction === "OUT" && <Ticks status={last.status} />}
                    <span className="truncate">{last?.body}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {selected ? (
            <div className={cn("flex flex-col", !selectedId && "hidden md:flex")}>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <Link href="/dashboard/inbox" className="md:hidden" aria-label="Back to conversations">
                  <ArrowLeft className="size-5 text-slate-500" />
                </Link>
                <div className="min-w-0">
                  <Link href={`/dashboard/leads/${selected.id}`} className="font-medium text-ink hover:underline">
                    {selected.firstName} {selected.lastName}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {selected.refCode} · {formatPhone(selected.phoneE164)}
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-4">
                {thread.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "OUT" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm", m.direction === "OUT" ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white")}>
                      {m.templateCode && (
                        <div className="mb-0.5 text-[10px] font-medium tracking-wide text-emerald-700 uppercase">
                          {m.templateCode.replace(/_/g, " ")} · {m.language} {m.sentById ? "" : "· auto"}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-slate-900">{m.body}</div>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                        {formatIST(m.createdAt, "d MMM, h:mm a")}
                        {m.direction === "OUT" && <Ticks status={m.status} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <InboxComposer leadId={selected.id} language={selected.language} templates={templates} demo={isDemoMode()} />
            </div>
          ) : (
            <div className="hidden items-center justify-center text-sm text-slate-500 md:flex">Pick a conversation.</div>
          )}
        </div>
      )}
    </div>
  );
}
