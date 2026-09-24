import { NextResponse, NextRequest } from "next/server";
import { getSubjects } from "@/lib/subjects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "true";

    const subjects = await getSubjects(!includeInactive);
    const names = subjects.map((s) => s.name);

    return NextResponse.json({
      subjects,
      schools: subjects,
      names,
      total: subjects.length,
    });
  } catch (error) {
    console.error("GET /api/subjects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch academic subjects" },
      { status: 500 }
    );
  }
}
