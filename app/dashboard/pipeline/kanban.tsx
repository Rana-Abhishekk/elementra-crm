"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { LeadStage, Product } from "@prisma/client";
import { FollowUpBadge } from "@/components/lead-badges";
import { Chip } from "@/components/ui";
import { PRODUCT_LABEL } from "@/lib/domain/labels";
import { formatLakh } from "@/lib/domain/money";
import { OPEN_STAGES, STAGE_LABEL, canTransition } from "@/lib/domain/stages";
import { cn } from "@/lib/utils";
import { LostModal, WonModal } from "../leads/[id]/stage-control";
import { changeStageAction } from "../leads/actions";

interface Card {
  id: string;
  refCode: string;
  name: string;
  stage: LeadStage;
  area: string;
  products: Product[];
  value: number | null;
  owner: string | null;
  nextFollowUpAt: Date | null;
  possessionDate: Date | null;
}

const initials = (n: string | null) => (n ? n.split(" ").map((p) => p[0]).slice(0, 2).join("") : "–");

export function Kanban({ leads, wonCount, lostCount, canReopen }: { leads: Card[]; wonCount: number; lostCount: number; canReopen: boolean }) {
  const router = useRouter();
  const [cards, setCards] = useState(leads);
  const [, start] = useTransition();
  const [closing, setClosing] = useState<{ card: Card; to: "CLOSED_WON" | "CLOSED_LOST" } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));

  // Server data wins after every refresh
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCards(leads), [leads]);

  function onDragEnd(e: DragEndEvent) {
    const card = cards.find((c) => c.id === e.active.id);
    const to = e.over?.id as LeadStage | undefined;
    if (!card || !to || to === card.stage) return;
    if (!canTransition(card.stage, to, canReopen)) {
      toast.error("Leads move forward, one step back, or to Won / Lost.");
      return;
    }
    if (to === "CLOSED_LOST" || to === "CLOSED_WON") return setClosing({ card, to });
    const before = cards;
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, stage: to } : c)));
    start(async () => {
      const res = await changeStageAction(card.id, { stage: to });
      if (res.ok) {
        toast.success(`${card.name}: ${STAGE_LABEL[to]}`);
        router.refresh();
      } else {
        setCards(before);
        toast.error(res.error);
      }
    });
  }

  const now = new Date();
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-3">
          {OPEN_STAGES.map((stage) => {
            const col = cards.filter((c) => c.stage === stage);
            const sum = col.reduce((s, c) => s + (c.value ?? 0), 0);
            return (
              <Column key={stage} id={stage} title={STAGE_LABEL[stage]} count={col.length} sum={sum}>
                {col.map((c) => (
                  <DraggableCard key={c.id} card={c} now={now} />
                ))}
              </Column>
            );
          })}
          <div className="flex w-44 shrink-0 flex-col gap-3">
            <DropZone id="CLOSED_WON" label="Won" hint={`${wonCount} in the last 30 days`} tone="emerald" />
            <DropZone id="CLOSED_LOST" label="Lost" hint={`${lostCount} in the last 30 days`} tone="rose" />
          </div>
        </div>
      </div>
      {closing?.to === "CLOSED_LOST" && <LostModal open onClose={() => setClosing(null)} leadId={closing.card.id} possessionDate={closing.card.possessionDate} />}
      {closing?.to === "CLOSED_WON" && <WonModal open onClose={() => setClosing(null)} leadId={closing.card.id} orderValue={closing.card.value} />}
    </DndContext>
  );
}

function Column({ id, title, count, sum, children }: { id: string; title: string; count: number; sum: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("flex w-64 shrink-0 flex-col rounded-xl bg-slate-100/80 p-2", isOver && "bg-gold-light ring-2 ring-gold")}>
      <div className="px-1 pt-1 pb-2">
        <div className="truncate text-xs font-semibold text-ink" title={title}>
          {title}
        </div>
        <div className="text-[11px] text-slate-500">
          {count} · {sum ? formatLakh(sum) : "₹0"}
        </div>
      </div>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </div>
  );
}

function DropZone({ id, label, hint, tone }: { id: string; label: string; hint: string; tone: "emerald" | "rose" }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center",
        tone === "emerald" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-rose-300 bg-rose-50 text-rose-700",
        isOver && "scale-[1.02] border-solid",
      )}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-[11px] opacity-80">{hint}</div>
      <div className="mt-1 text-[11px] opacity-60">Drop here</div>
    </div>
  );
}

function DraggableCard({ card, now }: { card: Card; now: Date }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-manipulation rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm active:cursor-grabbing", isDragging && "z-50 shadow-lg ring-2 ring-gold")}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/dashboard/leads/${card.id}`} className="font-medium text-ink hover:underline" onPointerDown={(e) => e.stopPropagation()}>
          {card.name}
        </Link>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white" title={card.owner ?? "Unassigned"}>
          {initials(card.owner)}
        </span>
      </div>
      <div className="truncate text-xs text-slate-500">
        {card.refCode}
        {card.area ? ` · ${card.area}` : ""}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {card.products.slice(0, 3).map((p) => (
          <Chip key={p} className="bg-slate-50 text-[10px] text-slate-600 ring-slate-200">
            {PRODUCT_LABEL[p]}
          </Chip>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <FollowUpBadge at={card.nextFollowUpAt} open now={now} />
        {card.value ? <span className="text-xs font-medium text-slate-700">{formatLakh(card.value)}</span> : null}
      </div>
    </div>
  );
}
