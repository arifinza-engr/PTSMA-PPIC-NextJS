"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BsArrowRight, BsBullseye, BsCalendar3, BsGraphUpArrow, BsPeople, BsTable } from "react-icons/bs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type GroupResult = {
  label: string;
  target: number;
  actual: number;
  percentage: number | null;
  operatorCount: number;
};

type LineResult = {
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
type ProductMetric = { key: string; product: string; unit: string; actual: number; target: number };

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

function attainmentVariant(value: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (value == null) return "outline";
  if (value >= 100) return "default";
  if (value >= 80) return "secondary";
  return "destructive";
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof BsBullseye;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-3 sm:px-4">
      <Icon className="shrink-0 text-primary" size={16} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

function Shortcut({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

export default function ExecutiveDashboard() {
  const [mode, setMode] = useState<"day" | "month">("day");
  const [day, setDay] = useState(todayLocal);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const activeLines = data?.summary.activeLines ?? 0;
  const targetLines = data?.summary.targetLines ?? lines.length;
  const totalGroups = data?.summary.operatorGroups ?? 0;
  const achievementRate = activeLines > 0 ? (data?.summary.achievedLines ?? 0) / activeLines * 100 : null;

  const productMetrics = useMemo(() => {
    const totals = new Map<string, ProductMetric>();
    for (const line of lines) {
      if (!line.groups.length) continue;
      const key = `${line.produk}-${line.satuan}`;
      const current = totals.get(key) ?? {
        key,
        product: line.produk,
        unit: line.satuan,
        actual: 0,
        target: 0,
      };
      current.actual += line.actual;
      current.target += line.target;
      totals.set(key, current);
    }
    return [...totals.values()].sort((a, b) => b.actual - a.actual).slice(0, 6);
  }, [lines]);

  const lowestLines = useMemo(() => lines
    .filter((line) => line.groups.length > 0 && line.percentage != null)
    .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
    .slice(0, 6), [lines]);

  return (
    <section aria-label="Dashboard analisis lini" className="space-y-4">
      <Card className="overflow-hidden">
        <header className="flex flex-col gap-4 bg-primary px-5 py-5 text-primary-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="max-w-xl">
            <Badge variant="secondary" className="mb-2">PPIC / Ringkasan eksekutif</Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analisis lini</h2>
            <p className="mt-1 text-sm text-primary-foreground/80">Grafik pencapaian dan produksi per periode.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="inline-flex w-fit items-center gap-1 rounded-md bg-background/10 p-1" role="group" aria-label="Periode laporan">
              <Button type="button" size="sm" variant={mode === "day" ? "secondary" : "ghost"} aria-pressed={mode === "day"} onClick={() => setMode("day")}>
                Harian
              </Button>
              <Button type="button" size="sm" variant={mode === "month" ? "secondary" : "ghost"} aria-pressed={mode === "month"} onClick={() => setMode("month")}>
                Bulanan
              </Button>
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
        <div className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
          <SummaryMetric label="Target lini/shift" value={loading ? "–" : targetLines} icon={BsGraphUpArrow} />
          <SummaryMetric label="Lini aktif" value={loading ? "–" : activeLines} icon={BsCalendar3} />
          <SummaryMetric label="Mencapai target" value={loading ? "–" : percentLabel(achievementRate)} icon={BsBullseye} />
          <SummaryMetric label="Grup operator" value={loading ? "–" : totalGroups} icon={BsPeople} />
        </div>
      </Card>

      {error && (
        <Alert role="alert" className="flex items-start gap-3">
          <BsBullseye className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target dan aktual per produk</CardTitle>
            <CardDescription>{data?.periodLabel ?? "Periode terpilih"} · {productMetrics.length} kelompok produk/satuan</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-5" aria-label="Memuat grafik" aria-live="polite">
                {[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted" />)}
              </div>
            ) : productMetrics.length ? (
              <>
                <div className="mb-4 flex gap-4 text-xs text-muted-foreground" aria-label="Legenda grafik">
                  <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" /> Aktual</span>
                  <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-muted-foreground/30" /> Target</span>
                </div>
                <div className="space-y-4" role="img" aria-label="Grafik perbandingan aktual dan target produksi per produk">
                  {productMetrics.map((metric) => {
                    const maxAmount = Math.max(1, metric.actual, metric.target);
                    return <div key={metric.key}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-semibold">{productLabel(metric.product)} <span className="font-normal text-muted-foreground">· {metric.unit}</span></span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{percentLabel(metric.target > 0 ? metric.actual / metric.target * 100 : null)}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2.5 overflow-hidden rounded-sm bg-muted" title={`Target ${amountLabel(metric.target)} ${metric.unit}`}>
                          <div className="h-full rounded-sm bg-muted-foreground/30" style={{ width: `${metric.target / maxAmount * 100}%` }} />
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-sm bg-muted" title={`Aktual ${amountLabel(metric.actual)} ${metric.unit}`}>
                          <div className="h-full rounded-sm bg-primary" style={{ width: `${metric.actual / maxAmount * 100}%` }} />
                        </div>
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                        <span>Aktual {amountLabel(metric.actual)}</span><span>Target {amountLabel(metric.target)}</span>
                      </div>
                    </div>
                  })}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada laporan produksi pada periode ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pencapaian lini terendah</CardTitle>
            <CardDescription>Maksimal 6 lini aktif yang perlu perhatian</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-5" aria-label="Memuat grafik" aria-live="polite">
                {[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted" />)}
              </div>
            ) : lowestLines.length ? (
              <div className="space-y-4" role="img" aria-label="Grafik persentase pencapaian lini dengan nilai terendah">
                {lowestLines.map((line, index) => (
                  <div key={`${line.produk}-${line.lini}-${line.shift}-${line.satuan}-${line.basis}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{line.lini}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{productLabel(line.produk)} · {line.shift} · {line.satuan}{line.basis === "per_orang" ? " / orang" : " / tim"}</p>
                      </div>
                      <Badge variant={attainmentVariant(line.percentage)} className="shrink-0 tabular-nums">{percentLabel(line.percentage)}</Badge>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-sm bg-muted">
                      <div className="absolute inset-y-0 left-0 w-px bg-foreground/20" style={{ left: "80%" }} aria-hidden="true" />
                      <div className="h-full rounded-sm bg-primary" style={{ width: `${Math.min(100, Math.max(0, line.percentage ?? 0))}%` }} />
                    </div>
                    {index === 0 && <p className="mt-1 text-[10px] text-muted-foreground">Penanda pada 80% · batas pencapaian target di 100%</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada lini aktif untuk dibandingkan.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="analysis-shortcuts" className="space-y-2.5">
        <h3 id="analysis-shortcuts" className="text-sm font-semibold">Pintasan</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Shortcut href="/hasil-produksi" title="Hasil Produksi" detail="Buka laporan dan ekspor data" />
          <Shortcut href="/target-produksi" title="Target Produksi" detail="Kelola target lini dan shift" />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">Target bulanan dihitung pada hari lini/shift memiliki laporan. Pencapaian 100% atau lebih memenuhi target.</p>
    </section>
  );
}
