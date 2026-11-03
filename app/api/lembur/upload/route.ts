// API route untuk upload bukti lembur
// POST: upload file bukti lembur

import { type NextRequest } from "next/server";
import { uploadBuktiLembur, parseMultipartForm, validateBuktiFile } from "@/lib/lembur-upload";
import { requireRole, requireSameOrigin } from "@/lib/authorize";

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv"]); if (forbidden) return forbidden;
  try {
    const { fields, file } = await parseMultipartForm(req);

    // Validate required fields
    const nama = fields.nama || "";
    const tanggal = fields.tanggal || "";

    if (!nama) {
      return Response.json({ error: "Nama wajib diisi." }, { status: 400 });
    }

    if (!tanggal) {
      return Response.json({ error: "Tanggal wajib diisi." }, { status: 400 });
    }

    // Validate file exists
    if (!file || file.size === 0) {
      return Response.json({ error: "File bukti tidak ditemukan." }, { status: 400 });
    }

    // Validate file type/size
    const validation = validateBuktiFile(file);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    // Upload file
    const result = await uploadBuktiLembur(file);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      url: result.url,
      filename: result.filename,
    });
  } catch (e) {
    console.error("Error upload route:", e);
    return Response.json(
      { error: `Gagal upload: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}

// Max body size untuk file upload (10MB)
export const runtime = "nodejs";
export const maxDuration = 60;
