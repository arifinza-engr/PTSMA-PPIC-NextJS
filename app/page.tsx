import Link from "next/link";
import {
  BsArrowRight,
  BsBoxSeam,
  BsClockHistory,
  BsGear,
  BsTable,
  BsTools,
} from "react-icons/bs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { todayWIBISO, formatTanggalID } from "@/lib/date";

const productionProducts = [
  {
    title: "Brakeshoe",
    description: "Form pencatatan produksi produk Brakeshoe",
    href: "/produksi/brakeshoe",
  },
  {
    title: "Discpad",
    description: "Form pencatatan produksi produk Discpad",
    href: "/produksi/discpad",
  },
  {
    title: "Handle",
    description: "Form pencatatan produksi produk Handle",
    href: "/produksi/handle",
  },
];

const operationalLinks = [
  {
    title: "Hasil Produksi",
    detail: "Lihat laporan dan ekspor data",
    href: "/hasil-produksi",
    icon: BsTable,
  },
  {
    title: "Stok Opname",
    detail: "Input dan tinjau stok per periode",
    href: "/stok-opname",
    icon: BsBoxSeam,
  },
  {
    title: "Pengajuan Lembur",
    detail: "Ajukan jadwal dan lampiran bukti",
    href: "/lembur",
    icon: BsClockHistory,
  },
];

const administrationLinks = [
  {
    title: "Persetujuan Lembur",
    detail: "Tinjau dan proses pengajuan lembur",
    href: "/lembur/daftar",
    icon: BsClockHistory,
  },
  {
    title: "Master Data",
    detail: "Kelola karyawan, produk, dan divisi",
    href: "/master",
    icon: BsGear,
  },
];

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TaskLinks({ items }: { items: typeof operationalLinks }) {
  return (
    <div className="divide-y rounded-lg border bg-white">
      {items.map(({ title, detail, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Icon
            className="size-4 shrink-0 text-primary/80"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <strong className="block text-sm font-medium">{title}</strong>
            <small className="mt-0.5 block text-sm leading-5 text-muted-foreground sm:mt-0 sm:text-right">
              {detail}
            </small>
          </span>
          <BsArrowRight
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-primary">PPIC Autopart</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ringkasan Operasional
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Akses pencatatan produksi, laporan, persediaan, dan administrasi.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BsClockHistory className="size-4" aria-hidden="true" />
          <time dateTime={todayWIBISO()}>
            {formatTanggalID(todayWIBISO())} WIB
          </time>
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="production-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1">
            <h2
              id="production-title"
              className="text-lg font-semibold tracking-tight sm:text-xl"
            >
              Pencatatan Produksi
            </h2>
            <p className="text-sm text-muted-foreground">
              Pilih produk akhir untuk membuka formulir pencatatan produksinya.
            </p>
          </div>
          <Badge variant="outline">3 produk akhir</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {productionProducts.map(({ title, description, href }, index) => (
            <Link
              key={href}
              href={href}
              className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full border-l-4 border-l-primary/70 transition-colors group-hover:bg-primary/[0.03]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-sm bg-primary/10 px-2 py-1 text-[11px] font-semibold tracking-wide text-primary">
                      PRODUK {String(index + 1).padStart(2, "0")}
                    </span>
                    <BsTools
                      className="size-[18px] text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <CardTitle className="pt-2 text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Buka formulir{" "}
                    <BsArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="operations-title">
        <SectionHeading
          id="operations-title"
          title="Operasional"
          description="Laporan produksi, persediaan, dan pengajuan lembur."
        />
        <TaskLinks items={operationalLinks} />
      </section>

      <section className="space-y-4" aria-labelledby="administration-title">
        <SectionHeading
          id="administration-title"
          title="Administrasi"
          description="Persetujuan pengajuan dan pengelolaan data referensi."
        />
        <TaskLinks items={administrationLinks} />
      </section>
    </div>
  );
}
