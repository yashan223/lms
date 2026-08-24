import { NextRequest, NextResponse } from "next/server";
import { getFileStream } from "@/lib/storage";
import { Readable } from "stream";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileKey: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileKeyArray = resolvedParams.fileKey;

    if (!fileKeyArray || fileKeyArray.length === 0) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    const fileKey = fileKeyArray.join("/");
    const rangeHeader = request.headers.get("range");

    const result = getFileStream(fileKey, rangeHeader);

    if (!result) {
      return new NextResponse("File not found or access denied", { status: 404 });
    }

    if ("error" in result && result.error === "RANGE_NOT_SATISFIABLE") {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${result.totalSize}`,
        },
      });
    }

    const { stream, isPartial, start, end, chunkSize, totalSize, mimeType, safePath } =
      result as {
        stream: import("fs").ReadStream;
        isPartial: boolean;
        start: number;
        end: number;
        chunkSize: number;
        totalSize: number;
        mimeType: string;
        safePath: string;
      };

    const isPrivate = fileKey.startsWith("private/");
    const filename = path.basename(safePath);

    // Convert Node ReadStream to Web ReadableStream for Next.js response
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize.toString(),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": isPrivate
        ? "private, no-cache"
        : "public, max-age=31536000, immutable",
    };

    if (isPartial) {
      headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
      return new NextResponse(webStream, {
        status: 206,
        headers,
      });
    }

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("File Serving Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
