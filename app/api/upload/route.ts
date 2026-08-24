import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile, SaveFileOptions } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in the request" },
        { status: 400 }
      );
    }

    const category = (formData.get("category") as any) || "general";
    const isPrivate = formData.get("isPrivate") === "true";
    const userId = formData.get("userId") as string | null;
    const saveToDb = formData.get("saveToDb") === "true" || formData.get("saveToPrivateFiles") === "true";
    const customPrefix = formData.get("prefix") as string | null;

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const options: SaveFileOptions = {
      category,
      isPrivate,
      customPrefix: customPrefix || undefined,
    };

    const savedFile = await saveUploadedFile(
      buffer,
      file.name,
      file.type,
      options
    );

    let dbRecord = null;

    // If student/instructor private file upload, persist to PrivateFile table
    if (saveToDb && userId) {
      dbRecord = await prisma.privateFile.create({
        data: {
          fileName: savedFile.fileName,
          fileSize: savedFile.fileSize,
          fileType: savedFile.fileType,
          fileUrl: savedFile.fileUrl,
          userId: userId,
        },
      });
      broadcastLMSEvent("MATERIALS_CHANGED");
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        ...savedFile,
        dbId: dbRecord?.id || null,
      },
    });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to upload file to VPS storage",
      },
      { status: 400 }
    );
  }
}
