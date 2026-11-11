"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BsBullseye,
  BsCalendar3,
  BsChevronDown,
  BsExclamationCircle,
  BsGraphUpArrow,
  BsPeople,
} from "react-icons/bs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const todayLocal = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const currentMonth = () => todayLocal().slice(0, 7);
const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const percentLabel = (value: number | null) => value == null ? "–" : `${numberFormat.format(value)}%`;
const amountLabel = (value: number) => numberFormat.format(value);

function attainmentVariant(value: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (value == null) return "outline";
  if (value >= 100) return "default";
  if (value >= 80) return "secondary";
  return "destructive";
}

function ProgressBar({ value, label }: { value: number | null; label: string }) {
  const width = value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <progress
      className="mt-3 h-2 w-full accent-primary"
      aria-label={`${label}: ${percentLabel(value)} dari target`}
      max={100}
      value={width}
    />
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  featured = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof BsBullseye;
  featured?: boolean;
}) {
  return (
    <Card className={`h-full ${featured ? "bg-primary text-primary-foreground" : ""}`}>
      <CardHeader className="flex-row items-start justify-between space-y-0 p-4 sm:p-5">
        <div className="min-w-0">
          <CardDescription className={featured ? "text-primary-foreground/75" : "uppercase tracking-wide"}>{label}</CardDescription>
          <CardTitle className="mt-3 text-3xl tabular-nums">{value}</CardTitle>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-background/10 text-current">
          <Icon size={16} aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className={`px-4 pb-4 pt-0 text-xs ${featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
        {detail}
      </CardContent>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const [mode, setMode] = useState<"day" | "month">("day");
  const [day, setDay] = useState(todayLocal);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

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
      .then((body) => { setData(body); setExpanded(null); })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat laporan target.");
        setData(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const lines = data?.lines ?? [];
  const totalGroups = data?.summary.operatorGroups ?? 0;
  const completeLines = data?.summary.achievedLines ?? 0;
  const activeLines = data?.summary.activeLines ?? 0;
  const targetLines = data?.summary.targetLines ?? lines.length;
  const achievementRate = activeLines > 0 ? completeLines / activeLines * 100 : null;

  return (
    <section aria-label="Dashboard target dan produksi" className="space-y-5">
      <Card className="overflow-hidden">
        <header className="flex flex-col gap-5 bg-primary px-5 py-6 text-primary-foreground sm:px-7 sm:py-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-xl">
            <Badge variant="secondary" className="mb-3">PPIC / Ringkasan eksekutif</Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Target &amp; Produksi</h1>
            <p className="mt-2 text-sm text-primary-foreground/80">Pantau pencapaian lini dan kontribusi operator terhadap target produksi.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="inline-flex w-fit items-center gap-1 rounded-md bg-background/10 p-1" role="group" aria-label="Periode laporan">
              <Button type="button" size="sm" variant={mode === "day" ? "secondary" : "ghost"} aria-pressed={mode === "day"} onClick={() => setMode("day")}>
                Harian
              </Button>
              <Button type="button" size="sm" variant={mode === "month" ? "secondary" : "ghost"} aria-pressed={mode === "month"} onClick={() => setMode("month")}>
                Bulanan
              </Button>
            </div>
            <label className="flex min-w-48 flex-col gap-1.5 text-xs font-medium text-primary-foreground/80">
              {mode === "day" ? "Pilih tanggal" : "Pilih bulan"}
              <Input
                type={mode === "day" ? "date" : "month"}
                value={periodValue}
                onChange={(event) => mode === "day" ? setDay(event.target.value) : setMonth(event.target.value)}
                className="bg-background text-foreground"
              />
            </label>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t bg-card px-5 py-3 text-xs text-muted-foreground sm:px-7">
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <BsGraphUpArrow aria-hidden="true" className="text-primary" />
            {data?.periodLabel ?? "Ringkasan periode"}
          </span>
          <span>{lines.length} target lini/shift</span>
          <span>{totalGroups} grup operator</span>
        </div>
      </Card>

      {error && (
        <Alert className="flex items-start gap-3">
          <BsExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </Alert>
      )}

      <section aria-label="Ringkasan pencapaian" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Lini mencapai target" value={loading ? "–" : `${completeLines} / ${activeLines}`} detail={`${percentLabel(achievementRate)} dari lini aktif`} icon={BsBullseye} featured />
        <SummaryMetric label="Target lini/shift" value={loading ? "–" : targetLines} detail="Target yang dikonfigurasi" icon={BsGraphUpArrow} />
        <SummaryMetric label="Lini/shift aktif" value={loading ? "–" : activeLines} detail="Memiliki laporan pada periode ini" icon={BsCalendar3} />
        <SummaryMetric label="Grup operator/tim" value={loading ? "–" : totalGroups} detail="Tercatat dalam laporan" icon={BsPeople} />
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-1 border-b p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <Badge variant="outline" className="mb-2">Analisis lini</Badge>
            <CardTitle className="text-base">Target dibanding produksi aktual</CardTitle>
          </div>
          <CardDescription>Persentase pencapaian = aktual ÷ target</CardDescription>
        </CardHeader>

        {loading ? (
          <div className="divide-y" aria-label="Memuat data target" aria-live="polite">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse px-4 py-5 sm:px-5">
                <div className="h-3 w-40 rounded bg-muted" />
                <div className="mt-4 h-2 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : lines.length === 0 && !error ? (
          <CardContent className="py-12 text-center">
            <BsBullseye className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-sm font-semibold">Belum ada target untuk periode ini</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Atur target per lini, shift, satuan, dan basis di menu Target Produksi.</p>
          </CardContent>
        ) : (
          <div className="divide-y">
            {lines.map((line) => {
              const key = `${line.produk}-${line.lini}-${line.shift}-${line.satuan}`;
              const detailsId = `line-details-${encodeURIComponent(key)}`;
              const isExpanded = expanded === key;
              const Icon = line.basis === "per_orang" ? BsPeople : BsBullseye;
              const hasActivity = line.groups.length > 0;
              const displayTarget = hasActivity ? line.target : line.targetPerUnit;
              return (
                <article key={key}>
                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(180px,1fr)_minmax(240px,1.25fr)_minmax(150px,auto)_auto] lg:items-center">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-primary"><Icon size={16} aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{line.lini}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{line.produk}</Badge>
                          <Badge variant="outline" className="text-[10px]">{line.shift}</Badge>
                          <Badge variant="outline" className="text-[10px]">{line.satuan}</Badge>
                        </span>
                      </span>
                    </span>

                    <span className="grid min-w-0 grid-cols-2 gap-2">
                      <span className="rounded-md border bg-background px-3 py-2">
                        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Aktual</span>
                        <strong className="mt-1 block text-base font-semibold tabular-nums text-foreground">{amountLabel(line.actual)} <span className="text-xs font-medium text-muted-foreground">{line.satuan}</span></strong>
                      </span>
                      <span className="rounded-md border bg-background px-3 py-2">
                        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {hasActivity ? "Target periode" : `Target / ${line.basis === "per_orang" ? "orang" : "tim"}`}
                        </span>
                        <strong className="mt-1 block text-base font-semibold tabular-nums text-foreground">{amountLabel(displayTarget)} <span className="text-xs font-medium text-muted-foreground">{line.satuan}</span></strong>
                      </span>
                    </span>

                    <span className="flex min-w-0 flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end lg:justify-center">
                      {hasActivity && line.target > 0 ? (
                        <>
                          <Badge variant={attainmentVariant(line.percentage)}>{percentLabel(line.percentage)}</Badge>
                          <span className="w-full"><ProgressBar value={line.percentage} label={`${line.lini} ${line.shift}`} /></span>
                        </>
                      ) : hasActivity ? (
                        <Badge variant="outline" className="whitespace-nowrap">Target bernilai 0</Badge>
                      ) : (
                        <Badge variant="outline" className="whitespace-nowrap">Belum ada laporan terhitung</Badge>
                      )}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`${isExpanded ? "Tutup" : "Buka"} rincian ${line.lini}, ${line.shift}`}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => setExpanded(isExpanded ? null : key)}
                      className="justify-self-end"
                    >
                      <BsChevronDown className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div id={detailsId} className="border-t bg-muted/30 px-4 py-4 sm:px-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold">Rincian {line.basis === "per_orang" ? "operator" : "tim"}</h3>
                        <Badge variant="outline">Target {line.basis === "per_orang" ? "per orang" : "per tim"} / {line.satuan}</Badge>
                      </div>
                      {line.groups.length === 0 ? (
                        <p className="py-3 text-sm text-muted-foreground">Belum ada laporan operator/tim untuk lini dan shift ini.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-md border bg-card">
                          <Table className="min-w-[500px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Operator / Tim</TableHead>
                                <TableHead className="text-right">Aktual</TableHead>
                                <TableHead className="text-right">Target</TableHead>
                                <TableHead className="text-right">Pencapaian</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {line.groups.map((group) => (
                                <TableRow key={group.label}>
                                  <TableCell className="font-medium">{group.label}<span className="ml-2 text-xs font-normal text-muted-foreground">{group.operatorCount} orang</span></TableCell>
                                  <TableCell className="text-right tabular-nums">{amountLabel(group.actual)} {line.satuan}</TableCell>
                                  <TableCell className="text-right tabular-nums">{amountLabel(group.target)} {line.satuan}</TableCell>
                                  <TableCell className="text-right"><Badge variant={attainmentVariant(group.percentage)}>{percentLabel(group.percentage)}</Badge></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {error && <div className="border-t px-5 py-4 text-center text-sm text-muted-foreground">Data target belum dapat ditampilkan.</div>}
      </Card>

      <footer className="flex flex-col gap-1 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <span>Aktual tim dengan beberapa operator dibagi rata untuk tampilan per orang. Target bulanan dihitung pada hari lini/shift memiliki laporan.</span>
        <span className="shrink-0">Pencapaian 100% atau lebih memenuhi target.</span>
      </footer>
    </section>
  );
}
