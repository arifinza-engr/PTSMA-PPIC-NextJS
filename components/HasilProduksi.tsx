"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { formatTanggalID } from "@/lib/date";
import {
  BsDownload,
  BsArrowLeft,
  BsArrowRight,
  BsSearch,
  BsX,
  BsArrowDown,
  BsArrowUp,
  BsArrowDownUp,
} from "react-icons/bs";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useProductionReportStore } from "@/lib/production-report-store";
import { useSession } from "next-auth/react";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import type { ProductionProductMaster } from "@/lib/production-master-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Line = "brakeshoe" | "discpad" | "handle";
type Cell = string | number | null;

interface DataResult {
  headers: string[];
  rows: Cell[][];
  total: number;
  limited: boolean;
  lini: string | null;
  recordIds: number[];
  assistedRows: boolean[];
}

interface ReportTableRow {
  cells: Cell[];
  recordId?: number;
  sourceIndex: number;
  assisted: boolean;
}

const reportTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
});
const reportColumn = createColumnHelper<typeof reportTableFeatures, ReportTableRow>();

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return formatTanggalID(dateStr);
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCell(val: Cell, header: string): string {
  if (val === "" || val === null || val === undefined) {
    return header === "HASIL PRODUKSI (SET)" ? "—" : "";
  }

  if (header.toUpperCase().includes("TANGGAL")) {
    return formatDate(String(val));
  }

  const upperHeader = header.toUpperCase();
  if (upperHeader.includes("PENCAPAIAN TARGET")) {
    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (Number.isFinite(num)) return num.toFixed(2) + "%";
  }
  if (upperHeader.includes("PERSENTASE") || upperHeader.includes("PCT")) {
    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (Number.isFinite(num)) {
      if (num <= 1) return (num * 100).toFixed(2) + "%";
      return num.toFixed(2) + "%";
    }
  }

  if (
    typeof val === "number" &&
    Number.isInteger(val) &&
    Math.abs(val) >= 100
  ) {
    return val.toLocaleString("id-ID");
  }

  return String(val);
}

export default function HasilProduksi({
  initialLine = "brakeshoe",
  initialLini = "",
  initialFrom = "",
  initialTo = "",
}: {
  initialLine?: Line;
  initialLini?: string;
  initialFrom?: string;
  initialTo?: string;
}) {
  const line = useProductionReportStore((state) => state.line);
  const lini = useProductionReportStore((state) => state.lini);
  const from = useProductionReportStore((state) => state.from);
  const to = useProductionReportStore((state) => state.to);
  const appliedFilters = useProductionReportStore((state) => state.appliedFilters);
  const searchQuery = useProductionReportStore((state) => state.searchQuery);
  const pagination = useProductionReportStore((state) => state.pagination);
  const sorting = useProductionReportStore((state) => state.sorting);
  const setLine = useProductionReportStore((state) => state.setLine);
  const setLini = useProductionReportStore((state) => state.setLini);
  const setFrom = useProductionReportStore((state) => state.setFrom);
  const setTo = useProductionReportStore((state) => state.setTo);
  const applyFilters = useProductionReportStore((state) => state.applyFilters);
  const clearAppliedFilters = useProductionReportStore((state) => state.clearAppliedFilters);
  const setSearchQuery = useProductionReportStore((state) => state.setSearchQuery);
  const setPagination = useProductionReportStore((state) => state.setPagination);
  const setSorting = useProductionReportStore((state) => state.setSorting);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const { data: session } = useSession();
  const canCorrect = session?.user.role === "ppic" || session?.user.role === "qc" || session?.user.role === "superadmin";
  const initialize = useProductionReportStore((state) => state.initialize);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialize({ line: initialLine, lini: initialLini, from: initialFrom, to: initialTo });
  }, [initialLine, initialLini, initialFrom, initialTo, initialize]);

  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["production-products"],
    queryFn: async () => {
      const response = await fetch("/api/master/produksi");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat daftar produk.");
      return body as ProductionProductMaster[];
    },
  });
  const masterQuery = useQuery({
    queryKey: ["production-master", line],
    queryFn: async () => {
      const response = await fetch(`/api/produksi/${line}/master?includeInactive=1`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat master produksi.");
      return (body.liniOptions ?? []) as string[];
    },
  });
  const linis = masterQuery.data ?? [];
  const dataQuery = useQuery<DataResult>({
    queryKey: ["production-data", appliedFilters],
    enabled: appliedFilters !== null,
    queryFn: async () => {
      if (!appliedFilters) throw new Error("Filter laporan belum dipilih.");
      const qs = new URLSearchParams({ lini: appliedFilters.lini });
      if (appliedFilters.from) qs.set("from", appliedFilters.from);
      if (appliedFilters.to) qs.set("to", appliedFilters.to);
      const response = await fetch(`/api/produksi/${appliedFilters.line}/data?${qs}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat data.");
      return body as DataResult;
    },
  });
  const data = dataQuery.data ?? null;
  const loading = dataQuery.isFetching;
  const err = (dataQuery.error instanceof Error ? dataQuery.error.message : "")
    || (masterQuery.error instanceof Error ? masterQuery.error.message : "")
    || exportError;
  const load = () => {
    if (!lini) return;
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    applyFilters({ line, lini, from, to });
  };

  async function exportExcel() {
    if (!lini) return;
    setExporting(true);
    setExportError("");

    try {
      const qs = new URLSearchParams({ lini });
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const r = await fetch(`/api/produksi/${line}/export?${qs}`);
      if (!r.ok) throw new Error("Gagal export data");

      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hasil-produksi-${line}-${lini}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/produksi/record/${id}?line=${line}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal menghapus laporan.");
      return body;
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["production-data"] }),
  });
  const deleteRecord = useCallback(async (id: number) => {
    if (
      !window.confirm(
        `Hapus laporan produksi #${id}? Tindakan ini dicatat dalam audit log.`,
      )
    )
      return;
    try { await deleteMutation.mutateAsync(id); }
    catch (cause) { window.alert(cause instanceof Error ? cause.message : "Gagal menghapus laporan."); }
  }, [deleteMutation]);

  const tableData = useMemo<ReportTableRow[]>(
    () => (data?.rows ?? []).map((cells, sourceIndex) => ({
      cells,
      sourceIndex,
      recordId: data?.recordIds?.[sourceIndex],
      assisted: data?.assistedRows?.[sourceIndex] ?? false,
    })),
    [data],
  );
  const columns = useMemo(() => reportColumn.columns([
    ...(data?.headers ?? []).map((header, columnIndex) => reportColumn.accessor(
      (row) => formatCell(row.cells[columnIndex] ?? null, header),
      {
        id: `report-column-${columnIndex}`,
        header,
        cell: (context) => context.getValue(),
      },
    )),
    ...(canCorrect ? [reportColumn.display({
      id: "actions",
      header: "Aksi",
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) => row.original.recordId ? (
        <span className="flex items-center gap-1">
          <Link
            href={`/produksi/${line}?edit=${row.original.recordId}`}
            className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ubah
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void deleteRecord(row.original.recordId!)}
            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Hapus
          </Button>
        </span>
      ) : null,
    })] : []),
  ]), [canCorrect, data?.headers, deleteRecord, line]);
  const table = useTable({
    features: reportTableFeatures,
    columns,
    data: tableData,
    globalFilterFn: "includesString",
    state: { globalFilter: searchQuery, pagination, sorting },
    onGlobalFilterChange: setSearchQuery,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });
  const filteredRows = table.getFilteredRowModel().rows;
  const visibleRows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">
            Laporan / Produksi
          </p>
          <h1 className="m-0 text-3xl font-bold tracking-tight">
            Hasil Produksi
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Telusuri, periksa, dan ekspor catatan produksi berdasarkan produk,
            lini, dan periode.
          </p>
        </div>
        {data && (
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Data laporan
          </Badge>
        )}
      </div>

      {/* Filter Controls */}
      <Card className="mb-6 border-border/80 shadow-sm">
        <CardHeader className="pb-5">
          <CardTitle className="text-base">Filter laporan</CardTitle>
          <CardDescription>
            Pilih kriteria untuk memuat data produksi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(150px,.8fr)_minmax(190px,1.1fr)_minmax(155px,.8fr)_minmax(155px,.8fr)_auto]">
            <div className="min-w-0">
              <Label className="mb-1.5 block">
                Produk
              </Label>
              <Select
                value={line}
                onChange={(e) => {
                  setLine(e.target.value as Line);
                  setLini("");
                  clearAppliedFilters();
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
              >
                {(productsQuery.data ?? []).map((product) => <option key={product.kode} value={product.kode}>{product.nama}</option>)}
              </Select>
            </div>

            <div className="min-w-0">
              <Label className="mb-1.5 block">
                Lini
              </Label>
              <Select
                value={lini}
                onChange={(e) => setLini(e.target.value)}
              >
                <option value="">-- Pilih Lini --</option>
                {linis.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>

            <div className="min-w-0">
              <Label className="mb-1.5 block">
                Dari
              </Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="text-foreground"
              />
            </div>

            <div className="min-w-0">
              <Label className="mb-1.5 block">
                Sampai
              </Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="text-foreground"
              />
            </div>

            <Button
              onClick={load}
              disabled={loading || !lini}
              className="w-full xl:w-auto"
            >
              {loading ? "Memuat..." : "Tampilkan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {err && (
        <Alert className="mb-6">
          {err}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-500">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Memuat data...</span>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!loading && data && (
        <>
          {/* Summary & Search */}
          <Card className="mb-4 border-border/80 shadow-sm">
            <CardContent className="flex min-h-24 flex-wrap items-center justify-between gap-4 p-4 pb-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {data.lini && (
                  <span className="font-semibold text-foreground">
                    {data.lini}
                  </span>
                )}
                {" - "}
                {data.total.toLocaleString("id-ID")} baris
                {data.limited && (
                  <Badge variant="secondary" className="text-amber-700">
                    Dibatasi
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="outline">
                    {filteredRows.length} ditemukan
                  </Badge>
                )}
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <BsSearch
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="text"
                    placeholder="Cari nama, type, dll..."
                    value={searchQuery}
                    onChange={(e) => {
                      table.setGlobalFilter(e.target.value);
                      table.setPageIndex(0);
                    }}
                    className="w-full !pl-9 !pr-9 sm:w-64"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus pencarian"
                      onClick={() => {
                        table.setGlobalFilter("");
                        table.setPageIndex(0);
                      }}
                      className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                    >
                      <BsX className="size-4" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={exportExcel}
                  disabled={exporting || !data}
                  variant="outline"
                  className="export-excel-button shrink-0 hover:bg-green-50"
                >
                  {exporting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Mengekspor...
                    </>
                  ) : (
                    <>
                      <BsDownload className="size-4" /> Export Excel
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Keterangan warna baris laporan">
            <span className="inline-block size-3 rounded-sm border border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-950" />
            <span>Baris kuning menandakan laporan dengan operator perbantuan.</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div ref={tableScrollRef} className="max-h-[68vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.getHeaderGroups().map((headerGroup) => headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <table.FlexRender header={header} />
                            {header.column.getIsSorted() === "asc" ? <BsArrowUp aria-hidden="true" /> : header.column.getIsSorted() === "desc" ? <BsArrowDown aria-hidden="true" /> : <BsArrowDownUp aria-hidden="true" />}
                          </Button>
                        ) : <table.FlexRender header={header} />}
                      </TableHead>
                    )))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={data.headers.length + 1}
                        className="h-32 text-center text-muted-foreground"
                      >
                        {searchQuery
                          ? "Tidak ada data yang cocok dengan pencarian"
                          : "Tidak ada data untuk periode ini"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                    {paddingTop > 0 && (
                      <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                        <TableCell colSpan={data.headers.length + 1} style={{ height: paddingTop, padding: 0 }} />
                      </TableRow>
                    )}
                    {virtualRows.map((virtualRow) => {
                      const row = visibleRows[virtualRow.index];
                      return (
                      <TableRow
                        key={row.id}
                        className={row.original.assisted
                          ? "bg-amber-100/80 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-950/70"
                          : undefined}
                      >
                        {row.getAllCells().map((cell) => (
                          <TableCell key={cell.id}>
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        ))}
                      </TableRow>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                        <TableCell colSpan={data.headers.length + 1} style={{ height: paddingBottom, padding: 0 }} />
                      </TableRow>
                    )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex w-full flex-col items-stretch justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Label htmlFor="results-page-size" className="whitespace-nowrap">
                  Baris per halaman
                </Label>
                <Select
                  id="results-page-size"
                  value={pagination.pageSize}
                  onChange={(e) => {
                    table.setPageSize(Number(e.target.value));
                  }}
                  className="h-9 w-[76px] px-2"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
                <span>
                  {filteredRows.length
                    ? `Menampilkan ${pagination.pageIndex * pagination.pageSize + 1}-${Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRows.length)} dari ${filteredRows.length} baris`
                    : "Menampilkan 0 baris"}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <BsArrowLeft /> Sebelumnya
                </Button>
                <span className="whitespace-nowrap px-1">
                  Halaman{" "}
                  <strong className="text-foreground">
                    {pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
                  </strong>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  Berikutnya <BsArrowRight />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !data && !err && !masterQuery.isError && (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed py-14 text-center text-muted-foreground shadow-none">
          <svg
            className="size-12 text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="m-0 text-sm">Pilih lini dan klik &quot;Tampilkan&quot; untuk melihat data</p>
        </Card>
      )}
    </div>
  );
}

