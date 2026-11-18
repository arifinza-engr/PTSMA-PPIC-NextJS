"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BsArrowRight,
  BsBullseye,
  BsCalendar3,
  BsChevronDown,
  BsGraphUpArrow,
  BsPeople,
  BsTable,
} from "react-icons/bs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  MetricRow,
  OperatorDetails,
} from "@/components/executive-dashboard/metric-row";
import type {
  DashboardMetric,
  LineResult,
  Performance,
} from "@/components/executive-dashboard/types";

type ApiError = { error?: string };
type ProductLineGroup = {
  line: string;
  hasTargets: boolean;
  metrics: DashboardMetric[];
};
type ProductGroup = {
  product: string;
  name: string;
  metrics: number;
  lines: ProductLineGroup[];
};

const todayLocal = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const currentMonth = () => todayLocal().slice(0, 7);
const numberFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});
const percentLabel = (value: number | null) =>
  value == null ? "–" : `${numberFormat.format(value)}%`;
const amountLabel = (value: number) => numberFormat.format(value);
const productLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
const basisLabel = (basis: LineResult["basis"]) =>
  basis === "per_orang" ? "Per orang" : "Tim";

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
        <p className="text-xl font-semibold tabular-nums leading-tight">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {detail}
        </p>
      </div>
    </div>
  );
}

function Shortcut({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
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
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {detail}
        </span>
      </span>
      <BsArrowRight
        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  );
}

function MetricSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-label="Memuat analisis produksi"
      aria-live="polite"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-md bg-muted" />
      ))}
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
    const search = new URLSearchParams({
      mode,
      [mode === "day" ? "date" : "month"]: periodValue,
    });
    return `/api/target-produksi/performance?${search.toString()}`;
  }, [mode, periodValue]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(query, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as Performance & ApiError;
        if (!response.ok)
          throw new Error(body.error || "Gagal memuat laporan target.");
        return body;
      })
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Gagal memuat laporan target.",
        );
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  const lines = data?.lines ?? [];
  const activeLineShifts = data?.summary.activeLines ?? 0;
  const targetLineShifts = data?.summary.targetLines ?? 0;
  const operatorGroups = data?.summary.operatorGroups ?? 0;
  const averageProductionAchievement = data?.summary.averageProductionAchievement ?? null;

  const productGroups = useMemo(() => {
    const metricsByLine = new Map<string, DashboardMetric[]>();
    for (const sourceLine of lines) {
      if (mode === "month" && !sourceLine.groups.length) continue;
      const metric: DashboardMetric = sourceLine.groups.length
        ? sourceLine
        : {
            ...sourceLine,
            target: sourceLine.targetPerUnit,
            actual: 0,
            percentage: 0,
            noReport: true,
          };
      const key = `${metric.produk}\u0000${metric.lini}`;
      metricsByLine.set(key, [...(metricsByLine.get(key) ?? []), metric]);
    }
    return (data?.activeProducts ?? []).map((product): ProductGroup => {
      const lineGroups = product.lines.map((line) => {
        const metrics = (
          metricsByLine.get(`${product.kode}\u0000${line.nama}`) ?? []
        ).sort((a, b) => {
          const shiftOrder = (value: string) =>
            Number(value.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
          const byShift = shiftOrder(a.shift) - shiftOrder(b.shift);
          if (byShift) return byShift;
          const byCategory = a.kategori.localeCompare(b.kategori, "id", {
            sensitivity: "base",
          });
          if (byCategory) return byCategory;
          return a.satuan.localeCompare(b.satuan);
        });
        return { line: line.nama, hasTargets: line.hasTargets, metrics };
      });
      return {
        product: product.kode,
        name: product.nama,
        metrics: lineGroups.reduce((sum, line) => sum + line.metrics.length, 0),
        lines: lineGroups,
      };
    });
  }, [data?.activeProducts, lines, mode]);

  return (
    <section aria-label="Dashboard monitoring produksi" className="space-y-4">
      <Card className="overflow-hidden">
        <header className="flex flex-col gap-4 bg-primary px-5 py-5 text-primary-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="max-w-xl">
            <Badge variant="secondary" className="mb-2">
              PPIC / Pemantauan eksekutif
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Dashboard Monitoring Produksi
            </h2>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Pencapaian produksi menurut produk, lini, dan target.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div
              className="inline-flex w-fit items-center gap-1 rounded-md bg-background/10 p-1"
              role="group"
              aria-label="Periode laporan"
            >
              <Button
                type="button"
                size="sm"
                variant={mode === "day" ? "secondary" : "ghost"}
                aria-pressed={mode === "day"}
                onClick={() => setMode("day")}
              >
                Harian
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "month" ? "secondary" : "ghost"}
                aria-pressed={mode === "month"}
                onClick={() => setMode("month")}
              >
                Bulanan
              </Button>
            </div>
            <label className="flex min-w-44 flex-col gap-1 text-xs font-medium text-primary-foreground/80">
              {mode === "day" ? "Pilih tanggal" : "Pilih bulan"}
              <Input
                type={mode === "day" ? "date" : "month"}
                value={periodValue}
                onChange={(event) =>
                  mode === "day"
                    ? setDay(event.target.value)
                    : setMonth(event.target.value)
                }
                className="h-9 bg-background text-foreground"
              />
            </label>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
          <BsCalendar3 className="text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground">
            {data?.periodLabel ?? "Periode terpilih"}
          </span>
          <span aria-hidden="true">·</span>
          <span>Ringkasan laporan pada periode ini</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
          <SummaryMetric
            label="Lini/shift aktif"
            value={loading ? "–" : activeLineShifts}
            detail="Kombinasi lini dan shift"
            icon={BsCalendar3}
          />
          <SummaryMetric
            label="Target lini/shift"
            value={loading ? "–" : targetLineShifts}
            detail="Kombinasi bertarget"
            icon={BsGraphUpArrow}
          />
          <SummaryMetric
            label="Rata-rata pencapaian"
            value={loading ? "–" : percentLabel(averageProductionAchievement)}
            detail="Rata-rata metrik produksi berlaporan"
            icon={BsGraphUpArrow}
          />
          <SummaryMetric
            label="Produksi"
            value={loading ? "–" : operatorGroups}
            detail="Data produksi tercatat"
            icon={BsPeople}
          />
        </div>
      </Card>

      {error && (
        <Alert role="alert" className="flex items-start gap-3">
          <BsBullseye className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </Alert>
      )}

      <section aria-label="Metrik pencapaian per produk" className="space-y-4">
        {loading ? (
          <MetricSkeleton />
        ) : productGroups.length ? (
          productGroups.map((group) => (
            <Card
              key={group.product}
              className="overflow-hidden border-l-4 border-l-primary/70"
            >
              <CardHeader className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <BsGraphUpArrow aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {group.name}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {group.lines.length} lini aktif
                      {group.metrics > 0 ? ` · ${group.metrics} metrik` : ""}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/hasil-produksi?line=${encodeURIComponent(group.product)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Lihat hasil produksi <BsArrowRight aria-hidden="true" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {group.lines.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">
                    Belum ada lini aktif pada produk ini.
                  </p>
                ) : (
                  group.lines.map((lineGroup, index) => (
                    <details
                      key={lineGroup.line}
                      open={index === 0}
                      className="group border-t first:border-t-0"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-primary/[0.035] px-4 py-3 text-left text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/[0.07] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                        <span>{lineGroup.line}</span>
                        <span className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-muted-foreground">
                          {lineGroup.metrics.length
                            ? `${lineGroup.metrics.length} rincian`
                            : lineGroup.hasTargets
                              ? "Belum ada laporan"
                              : "Master target belum diisi"}
                          <BsChevronDown
                            className="size-3.5 transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          />
                        </span>
                      </summary>
                      <section aria-label={`Metrik lini ${lineGroup.line}`}>
                        {lineGroup.metrics.length ? (
                          lineGroup.metrics.map((metric) => (
                            <MetricRow
                              key={`${metric.id}-${metric.produk}-${metric.lini}-${metric.shift}-${metric.satuan}-${metric.basis}`}
                              metric={metric}
                              onDetails={setSelectedMetric}
                            />
                          ))
                        ) : (
                          <p className="px-5 py-4 text-sm text-muted-foreground">
                            {lineGroup.hasTargets
                              ? "Belum ada laporan produksi pada periode ini."
                              : "Master target belum diisi untuk lini ini."}
                          </p>
                        )}
                      </section>
                    </details>
                  ))
                )}
              </CardContent>
            </Card>
          ))
        ) : !error ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BsBullseye
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="mt-3 text-sm font-semibold">
                Belum ada laporan produksi
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih periode lain atau buka hasil produksi untuk menelusuri
                laporan.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {error && (
        <p className="text-center text-xs text-muted-foreground">
          Metrik belum dapat ditampilkan.
        </p>
      )}

      <section aria-labelledby="analysis-shortcuts" className="space-y-2.5">
        <h3 id="analysis-shortcuts" className="text-sm font-semibold">
          Pintasan
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Shortcut
            href="/hasil-produksi"
            title="Hasil Produksi"
            detail="Telusuri laporan dan ekspor data"
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Nilai aktual dan target ditampilkan terpisah untuk setiap satuan dan shift.
        Mode Tim/Per orang mengikuti Master Lini. Pencapaian di atas 100% ditampilkan apa adanya.
      </p>

      {selectedMetric && (
        <Modal
          open={selectedMetric !== null}
          title={
            selectedMetric.basis === "per_orang"
              ? "Rincian operator"
              : "Rincian tim"
          }
          description={`${productLabel(selectedMetric.produk)} · ${selectedMetric.lini} · ${selectedMetric.shift} · ${selectedMetric.satuan} · ${basisLabel(selectedMetric.basis)}`}
          onClose={() => setSelectedMetric(null)}
        >
          <OperatorDetails metric={selectedMetric} />
        </Modal>
      )}
    </section>
  );
}
