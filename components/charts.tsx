"use client";

// Single-series charts (magnitude). One validated hue for data marks; status red only for "overdue";
// emphasis = one bar highlighted, the rest muted. Every chart also offers a table view.
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const VIZ = {
  series: "#2a78d6", // validated categorical slot 1 (light surface)
  critical: "#e34948", // status: overdue / breached
  muted: "#cbd5e1",
  grid: "#e2e8f0",
  axis: "#64748b",
  text: "#0f172a",
};

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
