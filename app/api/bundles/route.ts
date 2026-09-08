import { NextResponse } from "next/server";
import { getBundles } from "@/lib/bundles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const bundles = await getBundles();
    return NextResponse.json({
      success: true,
      bundles,
    });
  } catch (error: any) {
    console.error("GET /api/bundles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token bundles" },
      { status: 500 }
    );
  }
}
