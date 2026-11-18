import { BsArrowRight } from "react-icons/bs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardMetric, LineResult } from "./types";

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const amountLabel = (value: number) => numberFormat.format(value);
const percentLabel = (value: number | null) => value == null ? "–" : `${numberFormat.format(value)}%`;

function attainmentColors(value: number | null) {
  if (value == null) return { bar: "bg-muted-foreground/50", badge: "border-border bg-muted text-muted-foreground" };
  if (value >= 90) return { bar: "bg-green-600", badge: "border-green-200 bg-green-100 text-green-800" };
  if (value >= 80) return { bar: "bg-yellow-500", badge: "border-yellow-200 bg-yellow-100 text-yellow-800" };
  return { bar: "bg-red-600", badge: "border-red-200 bg-red-100 text-red-800" };
}

export function MetricRow({ metric, onDetails }: { metric: DashboardMetric; onDetails: (metric: LineResult) => void }) {
  const percentage = metric.noReport ? null : metric.percentage;
  const width = percentage == null ? 0 : Math.min(100, Math.max(0, percentage));
  const colors = attainmentColors(percentage);
  return (
    <article className="grid gap-3 border-t px-4 py-3 first:border-t-0 xl:grid-cols-[minmax(170px,0.8fr)_minmax(210px,1.1fr)_minmax(210px,1fr)_auto] xl:items-center sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{metric.shift}</p>
        {metric.noReport && <p className="mt-0.5 text-[10px] text-muted-foreground">Belum ada laporan</p>}
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
          <Badge variant="outline" className={`tabular-nums ${colors.badge}`}>{percentLabel(percentage)}</Badge>
        </div>
        {metric.noReport ? (
          <div className="h-2.5 rounded-full bg-muted" aria-label={`Belum ada laporan untuk ${metric.lini}`} />
        ) : (
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Pencapaian ${metric.lini}, ${metric.shift}, ${metric.kategori || "semua kategori"}, ${metric.satuan}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={width}
            aria-valuetext={percentLabel(percentage)}
          >
            <div className={`h-full rounded-full transition-[width] ${colors.bar}`} style={{ width: `${width}%` }} />
          </div>
        )}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={() => onDetails(metric)} className="w-full sm:w-auto">
        {metric.basis === "per_orang" ? "Rincian operator" : "Rincian tim"} <BsArrowRight aria-hidden="true" />
      </Button>
    </article>
  );
}

export function OperatorDetails({ metric }: { metric: LineResult }) {
  if (!metric.groups.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada rincian operator/tim untuk metrik ini pada periode terpilih.</p>;
  }
  return (
    <div>
      <div className="overflow-x-auto rounded-md border">
        <table className={`w-full ${metric.hasMesin ? "min-w-[820px]" : "min-w-[700px]"} table-fixed text-sm`}>
          <colgroup>
            <col className={metric.hasMesin ? "w-[24%]" : "w-[28%]"} />
            {metric.hasMesin && <col className="w-[10%]" />}
            <col className={metric.hasMesin ? "w-[10%]" : "w-[12%]"} />
            <col className={metric.hasMesin ? "w-[12%]" : "w-[14%]"} />
            <col className={metric.hasMesin ? "w-[14%]" : "w-[15%]"} />
            <col className={metric.hasMesin ? "w-[14%]" : "w-[15%]"} />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="bg-muted/70 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-left">{metric.basis === "per_orang" ? "Operator" : "Tim"}</th>
              {metric.hasMesin && <th scope="col" className="px-3 py-2.5 text-left">Mesin</th>}
              <th scope="col" className="px-3 py-2.5 text-left">Shift</th>
              <th scope="col" className="px-3 py-2.5 text-left">Kategori</th>
              <th scope="col" className="px-3 py-2.5 text-left">Aktual ({metric.satuan})</th>
              <th scope="col" className="px-3 py-2.5 text-left">Target ({metric.satuan})</th>
              <th scope="col" className="px-3 py-2.5 text-left">Pencapaian</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {metric.groups.map((group) => {
              const colors = attainmentColors(group.percentage);
              return (
              <tr key={`${group.kategori}-${group.label}`}>
                <th scope="row" className="min-w-0 whitespace-normal px-3 py-2.5 text-left font-medium [overflow-wrap:anywhere]">
                  <span className="block min-w-0 whitespace-normal">{group.label}</span>
                  {metric.basis === "per_orang" && group.operatorCount > 1 && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{group.operatorCount} orang</span>}
                </th>
                {metric.hasMesin && <td className="px-3 py-2.5 text-left tabular-nums">{group.mesin.length ? group.mesin.join(", ") : "—"}</td>}
                <td className="px-3 py-2.5 text-left">{metric.shift}</td>
                <td className="px-3 py-2.5 text-left">{group.kategori || "—"}</td>
                <td className="px-3 py-2.5 text-left tabular-nums">{amountLabel(group.actual)}</td>
                <td className="px-3 py-2.5 text-left tabular-nums">{amountLabel(group.target)}</td>
                <td className="px-3 py-2.5 text-left"><Badge variant="outline" className={`tabular-nums ${colors.badge}`}>{percentLabel(group.percentage)}</Badge></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
