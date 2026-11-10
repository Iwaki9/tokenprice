import { latency, pct } from "@/lib/format";
import type { MonitorStatus } from "@/lib/monitoring";
import type { Lang } from "@/lib/site";

export function VendorMark({
  name,
  color,
  mark,
  size = 22,
}: {
  name: string;
  color?: string;
  mark?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color ?? pickColor(name),
        fontSize: Math.max(9, Math.round(size * 0.45)),
      }}
    >
      {(mark ?? name.slice(0, 1)).toUpperCase()}
    </span>
  );
}

const PALETTE = ["#4b45d6", "#d97757", "#0f9d76", "#4285f4", "#7c3aed", "#b45309", "#0e7490"];

export function pickColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return PALETTE[hash % PALETTE.length];
}

const STATUS_TEXT: Record<MonitorStatus, Record<Lang, string>> = {
  ok: { ru: "работает", en: "operational" },
  degraded: { ru: "сбои", en: "degraded" },
  down: { ru: "недоступен", en: "down" },
  paused: { ru: "нет данных", en: "no data" },
  unknown: { ru: "не проверялся", en: "not checked" },
};

const STATUS_DOT: Record<MonitorStatus, string> = {
  ok: "#0b8a5c",
  degraded: "#b45309",
  down: "#b42318",
  paused: "#9ca3af",
  unknown: "#d6d2c7",
};

export function MonitorBadge({
  status,
  lang,
  uptime,
}: {
  status: MonitorStatus;
  lang: Lang;
  uptime?: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
      <span
        className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
        style={{ background: STATUS_DOT[status] }}
      />
      <span className="whitespace-nowrap">{STATUS_TEXT[status][lang]}</span>
      {uptime !== null && uptime !== undefined ? (
        <span className="tick text-muted/80">· {pct(uptime, 1)}</span>
      ) : null}
    </span>
  );
}

export function Sparkline({
  data,
  width = 84,
  height = 22,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  const points = data.filter((d) => d >= 0);
  if (points.length < 2) {
    return <span className="text-[12px] text-muted">—</span>;
  }
  const min = Math.min(...points, 90);
  const max = 100;
  const step = width / (points.length - 1);
  const y = (value: number) => height - ((value - min) / Math.max(1, max - min)) * height;
  const path = points.map((value, i) => `${i === 0 ? "M" : "L"}${i * step},${y(value)}`).join(" ");
  const stroke = points.every((p) => p >= 99) ? "#0b8a5c" : points.some((p) => p < 95) ? "#b42318" : "#b45309";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function DemoTag({ lang }: { lang: Lang }) {
  return (
    <span
      title={
        lang === "ru"
          ? "Демонстрационные данные. Замените их реальными через админку или краулер."
          : "Demo data. Replace it with real observations via the admin panel or crawler."
      }
      className="rounded px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wider text-warn"
      style={{ background: "var(--color-warn-soft)" }}
    >
      {lang === "ru" ? "демо" : "demo"}
    </span>
  );
}

export function StatBlock({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="display text-[30px] leading-none">{value}</div>
      <div className="mt-1.5 text-[12.5px] text-muted">{label}</div>
      {hint ? <div className="text-[11.5px] text-muted/70">{hint}</div> : null}
    </div>
  );
}

export function SectionHead({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="display text-[26px]">{title}</h2>
        {note ? <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card px-5 py-8 text-center text-[13.5px] text-muted">{children}</div>
  );
}

export function LatencyLabel({ ms }: { ms: number | null }) {
  return <span className="tick">{latency(ms)}</span>;
}
