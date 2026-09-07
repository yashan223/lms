import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import crypto from "crypto";
import { put, del } from "@vercel/blob";

export const STORAGE_ROOT =
  process.env.STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");

export const MIME_MAP: Record<string, string> = {

  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",

  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",

  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
};

export const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

export const SIZE_LIMITS: Record<string, number> = {
  avatar: 10 * 1024 * 1024,
  thumbnail: 15 * 1024 * 1024,
  document: 100 * 1024 * 1024,
  video: 1024 * 1024 * 1024,
  default: 50 * 1024 * 1024,
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function ensureStorageDirectories(): Promise<void> {
  const publicDir = path.join(process.cwd(), "storage", "uploads", "public");
  const privateDir = path.join(process.cwd(), "storage", "uploads", "private");
  if (fs.existsSync(/*turbopackIgnore: true*/ publicDir) === false) {
    await fsPromises.mkdir(/*turbopackIgnore: true*/ publicDir, { recursive: true });
  }
  if (fs.existsSync(/*turbopackIgnore: true*/ privateDir) === false) {
    await fsPromises.mkdir(/*turbopackIgnore: true*/ privateDir, { recursive: true });
  }
}

export function resolveSafeStoragePath(fileKey: string): string | null {
  if (!fileKey || typeof fileKey !== "string") return null;

  const sanitizedKey = fileKey.replace(/\0/g, "").replace(/^[\/\\]+/, "");
  const normalizedRoot = path.resolve(/*turbopackIgnore: true*/ STORAGE_ROOT);
  const resolvedPath = path.resolve(/*turbopackIgnore: true*/ STORAGE_ROOT, sanitizedKey);

  if (!resolvedPath.startsWith(normalizedRoot + path.sep) && resolvedPath !== normalizedRoot) {
    return null;
  }

  return resolvedPath;
}

export interface SaveFileOptions {
  category?: "avatar" | "thumbnail" | "document" | "video" | "general";
  isPrivate?: boolean;
  customPrefix?: string;
}

export interface SavedFileResult {
  fileKey: string;
  fileName: string;
  originalName: string;
  fileSize: string;
  fileSizeBytes: number;
  fileType: string;
  fileUrl: string;
  isPrivate: boolean;
}

export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string,
  options: SaveFileOptions = {}
): Promise<SavedFileResult> {
  const { category = "general", isPrivate = false, customPrefix } = options;

  const maxLimit = SIZE_LIMITS[category] || SIZE_LIMITS.default;
  if (fileBuffer.length > maxLimit) {
    throw new Error(
      `File size (${formatBytes(fileBuffer.length)}) exceeds the maximum allowed limit of ${formatBytes(maxLimit)}.`
    );
  }

  const detectedExt =
    MIME_MAP[mimeType.toLowerCase()] ||
    path.extname(originalFileName).toLowerCase() ||
    ".bin";

  const cleanOriginalName = path
    .basename(originalFileName)
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const uniqueId = crypto.randomBytes(16).toString("hex");
  const prefix = customPrefix ? `${customPrefix}_` : "";
  const storedFileName = `${prefix}${Date.now()}_${uniqueId}${detectedExt}`;
  const folder = isPrivate ? "private" : "public";
  const contentType = mimeType || EXTENSION_TO_MIME[detectedExt] || "application/octet-stream";

  // Use Vercel Blob if BLOB_READ_WRITE_TOKEN is configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPathname = `${folder}/${storedFileName}`;
      const blob = await put(blobPathname, fileBuffer, {
        access: "public",
        contentType,
      });

      return {
        fileKey: blob.url,
        fileName: cleanOriginalName,
        originalName: originalFileName,
        fileSize: formatBytes(fileBuffer.length),
        fileSizeBytes: fileBuffer.length,
        fileType: contentType,
        fileUrl: blob.url,
        isPrivate,
      };
    } catch (blobErr) {
      console.error("Vercel Blob upload failed, attempting local fallback:", blobErr);
    }
  }

  // Fallback to local filesystem storage
  await ensureStorageDirectories();

  const targetDir = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, folder);
  await fsPromises.mkdir(/*turbopackIgnore: true*/ targetDir, { recursive: true });

  const finalPath = path.join(/*turbopackIgnore: true*/ targetDir, storedFileName);
  await fsPromises.writeFile(/*turbopackIgnore: true*/ finalPath, fileBuffer);

  const fileKey = `${folder}/${storedFileName}`;
  const fileUrl = `/api/files/${fileKey}`;

  return {
    fileKey,
    fileName: cleanOriginalName,
    originalName: originalFileName,
    fileSize: formatBytes(fileBuffer.length),
    fileSizeBytes: fileBuffer.length,
    fileType: contentType,
    fileUrl,
    isPrivate,
  };
}

export async function deleteStorageFile(fileKey: string): Promise<boolean> {
  if (!fileKey || typeof fileKey !== "string") return false;

  // Handle Vercel Blob URL deletion
  if (
    fileKey.startsWith("http://") ||
    fileKey.startsWith("https://") ||
    fileKey.includes("blob.vercel-storage.com")
  ) {
    try {
      await del(fileKey);
      return true;
    } catch (err) {
      console.error(`Error deleting Vercel Blob file (${fileKey}):`, err);
      return false;
    }
  }

  // Fallback for local disk storage
  const safePath = resolveSafeStoragePath(fileKey);
  if (!safePath) return false;

  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ safePath)) {
      await fsPromises.unlink(/*turbopackIgnore: true*/ safePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error deleting storage file (${fileKey}):`, err);
    return false;
  }
}

export function getFileStream(fileKey: string, rangeHeader: string | null = null) {
  const safePath = resolveSafeStoragePath(fileKey);
  if (!safePath || !fs.existsSync(/*turbopackIgnore: true*/ safePath)) {
    return null;
  }

  const stat = fs.statSync(/*turbopackIgnore: true*/ safePath);
  if (!stat.isFile()) {
    return null;
  }

  const totalSize = stat.size;
  const ext = path.extname(safePath).toLowerCase();
  const mimeType = EXTENSION_TO_MIME[ext] || "application/octet-stream";

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
      return {
        error: "RANGE_NOT_SATISFIABLE" as const,
        totalSize,
      };
    }

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(/*turbopackIgnore: true*/ safePath, { start, end });

    return {
      stream,
      isPartial: true,
      start,
      end,
      chunkSize,
      totalSize,
      mimeType,
      safePath,
    };
  }

  const stream = fs.createReadStream(/*turbopackIgnore: true*/ safePath);
  return {
    stream,
    isPartial: false,
    start: 0,
    end: totalSize - 1,
    chunkSize: totalSize,
    totalSize,
    mimeType,
    safePath,
  };
}
