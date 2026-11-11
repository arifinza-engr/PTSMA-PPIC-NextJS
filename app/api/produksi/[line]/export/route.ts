import { type NextRequest } from "next/server";
import { getProductionData, type Line } from "@/lib/produksi";
import ExcelJS from "exceljs";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ line: string }> },
) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  const { line } = await params;
  const sp = req.nextUrl.searchParams;

  const lini = sp.get("lini");
  if (!lini) {
    return Response.json({ error: "Lini wajib dipilih" }, { status: 400 });
  }

  try {
    const result = await getProductionData(line as Line, {
      lini,
      from: sp.get("from"),
      to: sp.get("to"),
      limit: null,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Produksi ${line}`);

    // Add title row
    worksheet.mergeCells(1, 1, 1, result.headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `HASIL PRODUKSI - ${line.toUpperCase()} (${lini})`;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: "center" };

    // Add date range if provided
    const from = sp.get("from");
    const to = sp.get("to");
    if (from || to) {
      const dateRange = `Periode: ${from || "Awal"} - ${to || "Akhir"}`;
      worksheet.mergeCells(2, 1, 2, result.headers.length);
      const rangeCell = worksheet.getCell(2, 1);
      rangeCell.value = dateRange;
      rangeCell.font = { size: 10, italic: true };
      rangeCell.alignment = { horizontal: "center" };
    }

    // Add headers
    const headerRow = worksheet.addRow(result.headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" }, // Blue
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    result.rows.forEach((row, rowIdx) => {
      const dataRow = worksheet.addRow(row);
      dataRow.eachCell((cell, colNum) => {
        // Alternate row colors
        if (rowIdx % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" }, // Light slate
          };
        }

        // Format numbers with thousand separator
        if (typeof cell.value === "number" && cell.value >= 100) {
          cell.numFmt = "#,##0";
        }

        // Format percentages
        const header = result.headers[colNum - 1]?.toUpperCase() || "";
        if (header.includes("PERSENTASI") || header.includes("PCT")) {
          if (typeof cell.value === "number") {
            if (cell.value <= 1) {
              cell.numFmt = "0.00%";
            } else {
              cell.numFmt = "0.00%";
            }
          }
        }

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Add footer with total count
    const footerRow = worksheet.addRow([]);
    footerRow.getCell(1).value = `Total: ${result.total.toLocaleString("id-ID")} baris`;
    footerRow.getCell(1).font = { italic: true, size: 10 };

    // Auto-fit columns (approximate)
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value?.toString().length || 0;
        if (cellLength > maxLength) {
          maxLength = Math.min(cellLength, 50); // Cap at 50 chars
        }
      });
      column.width = maxLength + 2;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hasil-produksi-${line}-${lini}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
