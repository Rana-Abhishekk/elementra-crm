"use client";

// Single-series charts (magnitude). One validated hue for data marks; status red only for "overdue";
// emphasis = one bar highlighted, the rest muted. Every chart also offers a table view.
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatLakh } from "@/lib/domain/money";
import { VIZ } from "@/lib/viz";

export interface Datum {
  label: string;
  value: number;
  /** pre-formatted value for labels/tooltips */
  display?: string;
  highlight?: boolean;
}

function TableView({ data, valueLabel }: { data: Datum[]; valueLabel: string }) {
  return (
    <details className="mt-1 text-xs text-slate-500">
      <summary className="cursor-pointer select-none">View as table</summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="text-left">
            <th className="py-0.5 font-medium">Item</th>
            <th className="py-0.5 text-right font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-slate-100 text-slate-700">
              <td className="py-0.5">{d.label}</td>
              <td className="py-0.5 text-right">{d.display ?? d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function TooltipBox({ active, payload }: { active?: boolean; payload?: { payload: Datum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium text-ink">{d.label}</div>
      <div className="text-slate-600">{d.display ?? d.value}</div>
    </div>
  );
}

/** Horizontal bar ranking. `emphasis` mutes every bar that isn't highlighted. */
export function HBars({
  data,
  valueLabel,
  color = VIZ.series,
  emphasis,
  labelWidth = 110,
}: {
  data: Datum[];
  valueLabel: string;
  color?: string;
  emphasis?: boolean;
  labelWidth?: number;
}) {
  const height = Math.max(120, data.length * 30 + 16);
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${valueLabel}: ${data.map((d) => `${d.label} ${d.display ?? d.value}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={VIZ.grid} strokeWidth={1} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={labelWidth} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: VIZ.axis }} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.label} fill={emphasis && !d.highlight ? VIZ.muted : color} />
              ))}
              <LabelList dataKey="display" position="right" style={{ fontSize: 11, fill: VIZ.text }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView data={data} valueLabel={valueLabel} />
    </div>
  );
}

/** Vertical bars for a time series of counts (leads per day). */
export function DailyBars({ data, valueLabel }: { data: Datum[]; valueLabel: string }) {
  return (
    <div>
      <div className="h-48" role="img" aria-label={valueLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={VIZ.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: VIZ.grid }} tick={{ fontSize: 10, fill: VIZ.axis }} interval={4} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: VIZ.axis }} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
            <Bar dataKey="value" fill={VIZ.series} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView data={data} valueLabel={valueLabel} />
    </div>
  );
}

/** Small area trend (one series, 2px line). */
export function Trend({ data, valueLabel }: { data: Datum[]; valueLabel: string }) {
  return (
    <div className="h-40" role="img" aria-label={valueLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke={VIZ.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: VIZ.grid }} tick={{ fontSize: 10, fill: VIZ.axis }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: VIZ.axis }} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: VIZ.axis, strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="value" stroke={VIZ.series} strokeWidth={2} fill={VIZ.series} fillOpacity={0.12} isAnimationActive={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const lakhTick = (v: number) => (v === 0 ? "₹0" : formatLakh(v));

/** Tiny KPI trend. Gaps (null weeks) are bridged; hidden when there are fewer than 2 points to join. */
export function Sparkline({ data, valueLabel, format = "count" }: { data: { label: string; value: number | null }[]; valueLabel: string; format?: "count" | "money" | "percent" }) {
  const show = (v: number) => (format === "money" ? formatLakh(v) : format === "percent" ? `${v}%` : String(v));
  const points = data.map((d) => ({ ...d, display: d.value == null ? "No data" : show(d.value) }));
  if (points.filter((d) => d.value != null).length < 2) return null;
  return (
    <div className="mt-2 h-10 w-full" role="img" aria-label={`${valueLabel}, last ${data.length} weeks`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip content={<WeekTooltip />} cursor={{ stroke: VIZ.axis, strokeDasharray: "3 3" }} />
          <Area type="linear" dataKey="value" stroke={VIZ.series} strokeWidth={2} fill={VIZ.series} fillOpacity={0.1} connectNulls isAnimationActive={false} dot={{ r: 1.5, fill: VIZ.series, stroke: VIZ.series }} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: { label: string; display?: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs whitespace-nowrap shadow-md">
      <span className="text-slate-500">Week of {d.label}:</span> <span className="font-medium text-ink">{d.display}</span>
    </div>
  );
}

export interface FunnelStage {
  label: string;
  value: number;
  /** leads at this stage or further along: sets the band width, so the shape always narrows */
  reached: number;
  color: string;
  amount: number;
}

/** Funnel of open leads. A band's width is the leads at that stage or further along. */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const W = 220;
  const BAND = 26;
  const GAP = 2;
  const max = Math.max(stages[0]?.reached ?? 0, 1);
  const width = (n: number) => Math.max((n / max) * W, 36);
  return (
    <svg viewBox={`0 0 ${W} ${stages.length * (BAND + GAP)}`} className="mx-auto w-full max-w-60" role="img" aria-label={`Open leads by stage: ${stages.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
      {stages.map((s, i) => {
        const top = width(s.reached);
        const bottom = width(stages[i + 1]?.reached ?? s.reached * 0.8);
        const y = i * (BAND + GAP);
        const cx = W / 2;
        return (
          <polygon key={s.label} points={`${cx - top / 2},${y} ${cx + top / 2},${y} ${cx + bottom / 2},${y + BAND} ${cx - bottom / 2},${y + BAND}`} fill={s.color}>
            <title>{`${s.label}: ${s.value} leads here, ${s.reached} at this stage or further`}</title>
          </polygon>
        );
      })}
    </svg>
  );
}

/** Stage names are long, so they sit at an angle under the bars. */
function StageTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? "";
  return (
    <text x={x} y={y} dy={10} textAnchor="end" fontSize={10} fill={VIZ.axis} transform={`rotate(-35 ${x} ${y})`}>
      {label.length > 16 ? `${label.slice(0, 15)}…` : label}
    </text>
  );
}

/** Rupee value per open stage, in pipeline order. */
export function StageValueBars({ data }: { data: { label: string; value: number }[] }) {
  const rows = data.map((d) => ({ ...d, display: formatLakh(d.value) }));
  return (
    <div>
      <div className="h-72" role="img" aria-label={`Estimated value by stage: ${rows.map((d) => `${d.label} ${d.display}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={VIZ.grid} />
            <XAxis dataKey="label" interval={0} height={70} tickLine={false} axisLine={{ stroke: VIZ.grid }} tick={<StageTick />} />
            <YAxis width={62} tickFormatter={lakhTick} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: VIZ.axis }} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
            <Bar dataKey="value" fill={VIZ.brand} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView data={rows} valueLabel="Estimated value" />
    </div>
  );
}

/** Rupee value over time as a filled line. */
export function ValueArea({ data, valueLabel }: { data: { label: string; value: number }[]; valueLabel: string }) {
  const rows = data.map((d) => ({ ...d, display: formatLakh(d.value) }));
  return (
    <div>
      <div className="h-56" role="img" aria-label={valueLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={VIZ.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: VIZ.grid }} tick={{ fontSize: 10, fill: VIZ.axis }} />
            <YAxis width={62} tickFormatter={lakhTick} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: VIZ.axis }} />
            <Tooltip content={<TooltipBox />} cursor={{ stroke: VIZ.axis, strokeDasharray: "3 3" }} />
            <Area type="linear" dataKey="value" stroke={VIZ.series} strokeWidth={2} fill={VIZ.series} fillOpacity={0.14} isAnimationActive={false} dot={{ r: 4, fill: VIZ.series, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <TableView data={rows} valueLabel={valueLabel} />
    </div>
  );
}

function ForecastTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p) => p.dataKey === "actual")?.value;
  const forecast = payload.find((p) => p.dataKey === "forecast")?.value;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium text-ink">{label}</div>
      <div className="text-slate-600">{actual != null ? `Actual ${formatLakh(actual)}` : `Forecast ${formatLakh(forecast)}`}</div>
    </div>
  );
}

/** Won value by month, then the run-rate forecast as a dashed continuation. */
export function ForecastChart({ data }: { data: { label: string; actual: number | null; forecast: number | null }[] }) {
  const lastActual = [...data].reverse().find((d) => d.actual != null)?.label;
  return (
    <div>
      <div className="mb-1 flex gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5" style={{ background: VIZ.brand }} /> Actual</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed" style={{ borderColor: VIZ.brand }} /> Forecast</span>
      </div>
      <div className="h-56" role="img" aria-label={`Won value by month with forecast: ${data.map((d) => `${d.label} ${formatLakh(d.actual ?? d.forecast)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={VIZ.grid} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: VIZ.grid }} tick={{ fontSize: 10, fill: VIZ.axis }} />
            <YAxis width={62} tickFormatter={lakhTick} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: VIZ.axis }} />
            <Tooltip content={<ForecastTooltip />} cursor={{ stroke: VIZ.axis, strokeDasharray: "3 3" }} />
            {lastActual && <ReferenceLine x={lastActual} stroke={VIZ.axis} strokeDasharray="2 2" />}
            <Area type="linear" dataKey="actual" stroke={VIZ.brand} strokeWidth={2} fill={VIZ.brand} fillOpacity={0.12} isAnimationActive={false} dot={{ r: 4, fill: VIZ.brand, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
            <Line type="linear" dataKey="forecast" stroke={VIZ.brand} strokeWidth={2} strokeDasharray="5 4" isAnimationActive={false} dot={{ r: 4, fill: VIZ.brand, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Where this period's leads ended up, with the headline number in the hole. */
export function OutcomeDonut({ segments, center, caption }: { segments: { label: string; value: number; color: string }[]; center: string; caption: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const rows = segments.map((s) => ({ ...s, display: `${s.value} leads` }));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <div className="relative size-44 shrink-0" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" startAngle={90} endAngle={-270} paddingAngle={total ? 1 : 0} stroke="none" isAnimationActive={false}>
              {rows.map((s) => (
                <Cell key={s.label} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-ink">{center}</span>
          <span className="text-xs text-slate-500">{caption}</span>
        </div>
      </div>
      <ul className="min-w-36 space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="ml-auto pl-4 font-medium text-ink tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
