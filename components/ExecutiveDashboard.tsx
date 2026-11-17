"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BsArrowRight, BsBullseye, BsCalendar3, BsGraphUpArrow, BsPeople, BsTable } from "react-icons/bs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type GroupResult = {
  label: string;
  target: number;
  actual: number;
  percentage: number | null;
  operatorCount: number;
};

type LineResult = {
  id: number;
  produk: string;
  lini: string;
  shift: string;
  satuan: "PCS" | "SET" | "SHOT";
  basis: "per_orang" | "tim";
  target: number;
  targetPerUnit: number;
  actual: number;
  percentage: number | null;
  groups: GroupResult[];
};

type Performance = {
  periodLabel: string;
  summary: { targetLines: number; activeLines: number; achievedLines: number; operatorGroups: number };
  lines: LineResult[];
};

type ApiError = { error?: string };
type ProductLineGroup = { line: string; metrics: DashboardMetric[] };
type ProductGroup = { product: string; metrics: number; lines: ProductLineGroup[] };
type DashboardMetric = LineResult & { noReport?: boolean };

const todayLocal = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const currentMonth = () => todayLocal().slice(0, 7);
const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const percentLabel = (value: number | null) => value == null ? "–" : `${numberFormat.format(value)}%`;
const amountLabel = (value: number) => numberFormat.format(value);
const productLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const basisLabel = (basis: LineResult["basis"]) => basis === "per_orang" ? "Per orang" : "Tim";

function attainmentColor(value: number | null) {
  if (value == null) return "bg-muted-foreground/50";
  if (value >= 90) return "bg-emerald-600";
  if (value >= 80) return "bg-amber-500";
  return "bg-rose-600";
}

function attainmentVariant(value: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (value == null) return "outline";
  if (value >= 90) return "default";
  if (value >= 80) return "secondary";
  return "destructive";
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof BsBullseye;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:px-4">
      <Icon className="shrink-0 text-primary" size={16} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums leading-tight">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Shortcut({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <BsTable size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      </span>
      <BsArrowRight className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
}

function MetricSkeleton() {
  return <div className="space-y-3" aria-label="Memuat analisis produksi" aria-live="polite">{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-muted" />)}</div>;
}

function MetricRow({ metric, onDetails }: { metric: DashboardMetric; onDetails: (metric: LineResult) => void }) {
  const percentage = metric.noReport ? null : metric.percentage;
  const width = percentage == null ? 0 : Math.min(100, Math.max(0, percentage));
  return (
    <article className="grid gap-3 border-t px-4 py-3 first:border-t-0 xl:grid-cols-[minmax(170px,0.8fr)_minmax(210px,1.1fr)_minmax(210px,1fr)_auto] xl:items-center sm:px-5">
      <div className="min-w-0">
        <p className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">{metric.shift}</Badge>
          <Badge variant="outline" className="text-[10px]">{metric.satuan}</Badge>
          <Badge variant="outline" className="text-[10px]">{basisLabel(metric.basis)}</Badge>
          {metric.noReport && <Badge variant="secondary" className="text-[10px]">Belum ada laporan</Badge>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{metric.noReport ? `Target / ${metric.basis === "per_orang" ? "orang" : "tim"} / hari` : "Target periode"}</p>
          <p className="mt-0.5 font-semibold tabular-nums">{amountLabel(metric.target)} <span className="font-normal text-muted-foreground">{metric.satuan}</span></p>
        </div>
        <div className="rounded-md bg-primary/[0.06] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Aktual</p>
          <p className="mt-0.5 font-semibold tabular-nums">{metric.noReport ? "—" : amountLabel(metric.actual)} {!metric.noReport && <span className="font-normal text-muted-foreground">{metric.satuan}</span>}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Pencapaian</span>
          <div className="flex items-center gap-1.5">
            <Badge variant={attainmentVariant(percentage)} className="tabular-nums">{percentLabel(percentage)}</Badge>
          </div>
        </div>
        {metric.noReport ? (
          <div className="h-2.5 rounded-full bg-muted" aria-label={`Belum ada laporan untuk ${metric.lini}`} />
        ) : (
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Pencapaian ${metric.lini}, ${metric.shift}, ${metric.satuan}, ${basisLabel(metric.basis)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={width}
            aria-valuetext={percentLabel(percentage)}
          >
            <div className={`h-full rounded-full transition-[width] ${attainmentColor(percentage)}`} style={{ width: `${width}%` }} />
          </div>
        )}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={() => onDetails(metric)} className="w-full sm:w-auto">
        {metric.basis === "per_orang" ? "Rincian operator" : "Rincian tim"} <BsArrowRight aria-hidden="true" />
      </Button>
    </article>
  );
}

function OperatorDetails({ metric }: { metric: LineResult }) {
  if (!metric.groups.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada rincian operator/tim untuk metrik ini pada periode terpilih.</p>;
  }
  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">{productLabel(metric.produk)} · {metric.lini} · {metric.shift} · {metric.satuan} · {basisLabel(metric.basis)}</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-muted/70 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5">{metric.basis === "per_orang" ? "Operator" : "Tim"}</th>
              <th scope="col" className="px-3 py-2.5 text-right">Aktual</th>
              <th scope="col" className="px-3 py-2.5 text-right">Target</th>
              <th scope="col" className="px-3 py-2.5 text-right">Pencapaian</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {metric.groups.map((group) => (
              <tr key={group.label}>
                <th scope="row" className="px-3 py-2.5 font-medium">
                  {group.label}
                  {metric.basis === "per_orang" && group.operatorCount > 1 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{group.operatorCount} orang</span>}
                </th>
                <td className="px-3 py-2.5 text-right tabular-nums">{amountLabel(group.actual)} {metric.satuan}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{amountLabel(group.target)} {metric.satuan}</td>
                <td className="px-3 py-2.5 text-right"><Badge variant={attainmentVariant(group.percentage)} className="tabular-nums">{percentLabel(group.percentage)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [mode, setMode] = useState<"day" | "month">("day");
  const [day, setDay] = useState(todayLocal);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<LineResult | null>(null);

  const periodValue = mode === "day" ? day : month;
  const query = useMemo(() => {
    const search = new URLSearchParams({ mode, [mode === "day" ? "date" : "month"]: periodValue });
    return `/api/target-produksi/performance?${search.toString()}`;
  }, [mode, periodValue]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(query, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as Performance & ApiError;
        if (!response.ok) throw new Error(body.error || "Gagal memuat laporan target.");
        return body;
      })
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat laporan target.");
        setData(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const lines = data?.lines ?? [];
  const activeLineShifts = data?.summary.activeLines ?? 0;
  const targetLineShifts = data?.summary.targetLines ?? lines.length;
  const operatorGroups = data?.summary.operatorGroups ?? 0;
  const achievementRate = activeLineShifts > 0 ? (data?.summary.achievedLines ?? 0) / activeLineShifts * 100 : null;

  const productGroups = useMemo(() => {
    const products = new Map<string, DashboardMetric[]>();
    for (const sourceLine of lines) {
      if (mode === "month" && !sourceLine.groups.length) continue;
      const line: DashboardMetric = sourceLine.groups.length
        ? sourceLine
        : { ...sourceLine, target: sourceLine.targetPerUnit, actual: 0, percentage: 0, noReport: true };
      const metrics = products.get(line.produk) ?? [];
      metrics.push(line);
      products.set(line.produk, metrics);
    }
    return [...products.entries()].map(([product, productMetrics]): ProductGroup => {
      const orderedMetrics = productMetrics
        .sort((a, b) => {
          if (Boolean(a.noReport) !== Boolean(b.noReport)) return a.noReport ? 1 : -1;
          return (a.percentage ?? Number.POSITIVE_INFINITY) - (b.percentage ?? Number.POSITIVE_INFINITY);
        })
        .slice(0, 5);
      const lineGroups = new Map<string, LineResult[]>();
      for (const metric of orderedMetrics) {
        const metrics = lineGroups.get(metric.lini) ?? [];
        metrics.push(metric);
        lineGroups.set(metric.lini, metrics);
      }
      return {
        product,
        metrics: orderedMetrics.length,
        lines: [...lineGroups.entries()].map(([line, metrics]) => ({ line, metrics })),
      };
    });
  }, [lines, mode]);

  return (
    <section aria-label="Dashboard monitoring produksi" className="space-y-4">
      <Card className="overflow-hidden">
        <header className="flex flex-col gap-4 bg-primary px-5 py-5 text-primary-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="max-w-xl">
            <Badge variant="secondary" className="mb-2">PPIC / Pemantauan eksekutif</Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard Monitoring Produksi</h2>
            <p className="mt-1 text-sm text-primary-foreground/80">Pencapaian produksi menurut produk, lini, dan target.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="inline-flex w-fit items-center gap-1 rounded-md bg-background/10 p-1" role="group" aria-label="Periode laporan">
              <Button type="button" size="sm" variant={mode === "day" ? "secondary" : "ghost"} aria-pressed={mode === "day"} onClick={() => setMode("day")}>Harian</Button>
              <Button type="button" size="sm" variant={mode === "month" ? "secondary" : "ghost"} aria-pressed={mode === "month"} onClick={() => setMode("month")}>Bulanan</Button>
            </div>
            <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-primary-foreground/80">
              {mode === "day" ? "Pilih tanggal" : "Pilih bulan"}
              <Input
                type={mode === "day" ? "date" : "month"}
                value={periodValue}
                onChange={(event) => mode === "day" ? setDay(event.target.value) : setMonth(event.target.value)}
                className="h-9 bg-background text-foreground"
              />
            </label>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
          <BsCalendar3 className="text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">{data?.periodLabel ?? "Periode terpilih"}</span>
          <span aria-hidden="true">·</span>
          <span>Ringkasan laporan pada periode ini</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
          <SummaryMetric label="Lini/shift aktif" value={loading ? "–" : activeLineShifts} detail="Kombinasi lini dan shift" icon={BsCalendar3} />
          <SummaryMetric label="Target lini/shift" value={loading ? "–" : targetLineShifts} detail="Kombinasi bertarget" icon={BsGraphUpArrow} />
          <SummaryMetric label="Mencapai target" value={loading ? "–" : percentLabel(achievementRate)} detail="Lini/shift aktif ≥100%" icon={BsBullseye} />
          <SummaryMetric label="Grup operator" value={loading ? "–" : operatorGroups} detail="Grup tercatat" icon={BsPeople} />
        </div>
      </Card>

      {error && (
        <Alert role="alert" className="flex items-start gap-3">
          <BsBullseye className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </Alert>
      )}

      <section aria-label="Metrik pencapaian per produk" className="space-y-4">
        {loading ? <MetricSkeleton /> : productGroups.length ? productGroups.map((group) => (
          <Card key={group.product} className="overflow-hidden border-l-4 border-l-primary/70">
            <CardHeader className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><BsGraphUpArrow aria-hidden="true" /></span>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{productLabel(group.product)}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">{group.metrics} metrik sesuai filter</p>
                </div>
              </div>
              <Link href={`/hasil-produksi?line=${encodeURIComponent(group.product)}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Lihat hasil produksi <BsArrowRight aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {group.lines.map((lineGroup) => (
                <section key={lineGroup.line} aria-label={`Lini ${lineGroup.line}`}>
                  <h3 className="border-t bg-primary/[0.035] px-4 py-2 text-xs font-semibold text-primary first:border-t-0 sm:px-5">{lineGroup.line}</h3>
                  {lineGroup.metrics.map((metric) => (
                    <MetricRow key={`${metric.id}-${metric.produk}-${metric.lini}-${metric.shift}-${metric.satuan}-${metric.basis}`} metric={metric} onDetails={setSelectedMetric} />
                  ))}
                </section>
              ))}
            </CardContent>
          </Card>
        )) : !error ? (
          <Card><CardContent className="py-10 text-center">
            <BsBullseye className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold">Belum ada laporan produksi</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pilih periode lain atau buka hasil produksi untuk menelusuri laporan.</p>
          </CardContent></Card>
        ) : null}
      </section>

      {error && <p className="text-center text-xs text-muted-foreground">Metrik belum dapat ditampilkan.</p>}

      <section aria-labelledby="analysis-shortcuts" className="space-y-2.5">
        <h3 id="analysis-shortcuts" className="text-sm font-semibold">Pintasan</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Shortcut href="/hasil-produksi" title="Hasil Produksi" detail="Telusuri laporan dan ekspor data" />
          <Shortcut href="/target-produksi" title="Target Produksi" detail="Kelola target lini, shift, dan basis" />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">Nilai aktual dan target ditampilkan terpisah untuk setiap satuan, shift, dan basis target. Pencapaian di atas 100% ditampilkan apa adanya.</p>

      {selectedMetric && (
        <Modal
          open={selectedMetric !== null}
          title={selectedMetric.basis === "per_orang" ? "Rincian operator" : "Rincian tim"}
          description={`${productLabel(selectedMetric.produk)} · ${selectedMetric.lini} · ${selectedMetric.shift} · ${selectedMetric.satuan} · ${basisLabel(selectedMetric.basis)}`}
          onClose={() => setSelectedMetric(null)}
        >
          <OperatorDetails metric={selectedMetric} />
        </Modal>
      )}
    </section>
  );
}
