"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { FollowUpBadge } from "@/components/lead-badges";
import { Chip } from "@/components/ui";
import { formatLakh } from "@/lib/domain/money";
import { canTransition, type StageRef } from "@/lib/domain/stages";
import { cn } from "@/lib/utils";
import { LostModal, WonModal } from "../leads/[id]/stage-control";
import { changeStageAction } from "../leads/actions";

interface Card {
  id: string;
  refCode: string;
  name: string;
  stageId: string;
  area: string;
  products: string[];
  value: number | null;
  owner: string | null;
  nextFollowUpAt: Date | null;
  possessionDate: Date | null;
}

const initials = (n: string | null) => (n ? n.split(" ").map((p) => p[0]).slice(0, 2).join("") : "–");

const WON = "__won__";
const LOST = "__lost__";

/** Columns = the pipeline's active Open stages in the admin's order; Won / Lost open a stage picker. */
export function Kanban({
  leads,
  stages,
  wonCount,
  lostCount,
  canReopen,
  canMove,
}: {
  leads: Card[];
  /** Every stage of the selected pipeline (inactive ones too, for leads still sitting in them) */
  stages: StageRef[];
  wonCount: number;
  lostCount: number;
  canReopen: boolean;
  canMove: boolean;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(leads);
  const [, start] = useTransition();
  const [closing, setClosing] = useState<{ card: Card; to: typeof WON | typeof LOST } | null>(null);
  const active = stages.filter((st) => st.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const columns = active.filter((st) => st.category === "OPEN");
  // Leads in a deactivated open stage still need a column until they're moved
  const orphaned = stages.filter((st) => !st.isActive && st.category === "OPEN" && cards.some((c) => c.stageId === st.id));
  const wonStages = active.filter((st) => st.category === "WON");
  const lostStages = active.filter((st) => st.category === "LOST");
  const byId = (id: string) => stages.find((st) => st.id === id);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));

  // Server data wins after every refresh
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCards(leads), [leads]);

  function onDragEnd(e: DragEndEvent) {
    const card = cards.find((c) => c.id === e.active.id);
    const to = e.over?.id as string | undefined;
    if (!card || !to || to === card.stageId) return;
    if (!canMove) return void toast.error("You don't have permission to move stages.");
    if (to === WON || to === LOST) return setClosing({ card, to });
    const from = byId(card.stageId);
    const target = byId(to);
    if (!from || !target || !canTransition(stages, from, target, canReopen)) {
      toast.error("Leads move forward, one step back, or to Won / Lost.");
      return;
    }
    const before = cards;
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, stageId: to } : c)));
    start(async () => {
      const res = await changeStageAction(card.id, { stageId: to });
      if (res.ok) {
        toast.success(`${card.name}: ${target.label}`);
        router.refresh();
      } else {
        setCards(before);
        toast.error(res.error);
      }
    });
  }

  const now = new Date();
  const board = useRef<HTMLDivElement>(null);
  // Fit the board to the window so its horizontal scrollbar is always visible
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  useEffect(() => {
    const fit = () => {
      const top = board.current?.getBoundingClientRect().top ?? 0;
      setBoardHeight(Math.max(420, window.innerHeight - top - 16));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const scrollBy = (dir: -1 | 1) => board.current?.scrollBy({ left: dir * 560, behavior: "smooth" });
  return (
    <DndContext id="kanban" sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mb-2 flex items-center justify-end gap-1">
        <span className="mr-1 hidden text-xs text-slate-400 sm:inline">Scroll the board</span>
        <button type="button" onClick={() => scrollBy(-1)} className="btn-secondary px-2 py-1" aria-label="Scroll left">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" onClick={() => scrollBy(1)} className="btn-secondary px-2 py-1" aria-label="Scroll right">
          <ChevronRight className="size-4" />
        </button>
      </div>
      {/* Fixed-height board: the horizontal scrollbar stays on screen; each column scrolls on its own */}
      <div
        ref={board}
        style={boardHeight ? { height: boardHeight } : undefined}
        className="scrollbar-board -mx-4 h-[calc(100vh-18rem)] min-h-[420px] overflow-x-auto overflow-y-hidden px-4 pb-3 md:mx-0 md:px-0"
      >
        <div className="flex h-full w-max gap-3">
          {[...columns, ...orphaned].map((stage) => {
            const col = cards.filter((c) => c.stageId === stage.id);
            const sum = col.reduce((s, c) => s + (c.value ?? 0), 0);
            return (
              <Column key={stage.id} id={stage.id} title={stage.isActive ? stage.label : `${stage.label} (inactive)`} color={stage.color} count={col.length} sum={sum}>
                {col.map((c) => (
                  <DraggableCard key={c.id} card={c} now={now} />
                ))}
              </Column>
            );
          })}
          <div className="flex w-44 shrink-0 flex-col gap-3">
            {wonStages.length > 0 && <DropZone id={WON} label={wonStages.length === 1 ? wonStages[0].label : "Won"} hint={`${wonCount} in the last 30 days`} tone="emerald" />}
            {lostStages.length > 0 && <DropZone id={LOST} label="Lost" hint={`${lostCount} in the last 30 days`} tone="rose" />}
          </div>
        </div>
      </div>
      {closing?.to === LOST && <LostModal open onClose={() => setClosing(null)} leadId={closing.card.id} stages={lostStages} possessionDate={closing.card.possessionDate} />}
      {closing?.to === WON && <WonModal open onClose={() => setClosing(null)} leadId={closing.card.id} stages={wonStages} orderValue={closing.card.value} />}
    </DndContext>
  );
}

function Column({ id, title, color, count, sum, children }: { id: string; title: string; color: string; count: number; sum: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("flex h-full w-64 shrink-0 flex-col rounded-xl bg-slate-100/80 p-2", isOver && "bg-gold-light ring-2 ring-gold")}>
      <div className="border-t-2 px-1 pt-1 pb-2" style={{ borderColor: color }}>
        <div className="truncate text-xs font-semibold text-ink" title={title}>
          {title}
        </div>
        <div className="text-[11px] text-slate-500">
          {count} · {sum ? formatLakh(sum) : "₹0"}
        </div>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">{children}</div>
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
            {p}
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
