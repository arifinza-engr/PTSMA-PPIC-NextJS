// Upload bukti lembur — alternative untuk Google Drive

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.resolve(/* turbopackIgnore: true */ process.env.LEMBUR_STORAGE_DIR ?? path.join(process.cwd(), "storage", "lembur"));

// Allowed MIME types for bukti lembur
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB, sesuai PPIC V1

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

/**
 * Validasi file sebelum upload
 */
export function validateBuktiFile(file: File): { valid: boolean; error?: string } {
  if (!file || file.size === 0) {
    return { valid: false, error: "File tidak ditemukan." };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: `Ukuran file maksimal 5MB. File saat ini: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Tipe file tidak diizinkan. Gunakan JPG, JPEG, atau PNG.` };
  }

  return { valid: true };
}

/**
 * Generate unique filename dengan pattern: {nama}_{tanggal}_{timestamp}.{ext}
 */
function generateFilename(type: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png",
  };
  return `${randomUUID()}.${extensions[type]}`;
}

function matchesContent(type: string, bytes: Buffer): boolean {
  if (type === "image/jpeg") return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  await mkdir(/* turbopackIgnore: true */ UPLOAD_DIR, { recursive: true });
}

/**
 * Convert File (from browser) to Buffer
 */
async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload bukti lembur - simpan ke filesystem
 * @param file - File object dari browser
 * @param nama - Nama karyawan untuk filename
 * @param tanggal - Tanggal lembur untuk filename
 * @returns Promise<UploadResult> dengan URL file yang bisa diakses
 */
export async function uploadBuktiLembur(
  file: File,
): Promise<UploadResult> {
  try {
    // Validate
    const validation = validateBuktiFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Ensure directory exists
    await ensureUploadDir();

    // Generate filename
    const buffer = await fileToBuffer(file);
    if (!matchesContent(file.type, buffer)) {
      return { success: false, error: "Isi file tidak sesuai dengan tipe yang dipilih." };
    }
    const filename = generateFilename(file.type);
    const filePath = path.join(/* turbopackIgnore: true */ UPLOAD_DIR, filename);
    await writeFile(filePath, buffer);

    // Return URL yang bisa diakses via browser
    // Format: /uploads/lembur/{filename}
    const url = `/api/lembur/bukti/${filename}`;

    return {
      success: true,
      url,
      filename,
    };
  } catch (e) {
    console.error("Error uploadBuktiLembur:", e);
    return {
      success: false,
      error: `Gagal upload file: ${(e as Error).message}`,
    };
  }
}

/**
 * Parse multipart form data - untuk API route
 * Compatible dengan Next.js 14+ App Router
 */
export async function parseMultipartForm(
  req: Request
): Promise<{ fields: Record<string, string>; file?: File }> {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    const body = await req.json();
    return { fields: body };
  }

  const formData = await req.formData();
  const fields: Record<string, string> = {};
  let file: File | undefined;

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (key === "bukti") {
        file = value;
      } else {
        fields[key] = await value.text();
      }
    } else {
      fields[key] = value as string;
    }
  }

  return { fields, file };
}

/**
 * Get full path untuk file yang sudah diupload
 */
export function getBuktiPath(filename: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}\.(?:jpg|png|gif|webp|pdf)$/.test(filename)) {
    throw new Error("Nama berkas tidak valid.");
  }
  return path.join(/* turbopackIgnore: true */ UPLOAD_DIR, filename);
}
