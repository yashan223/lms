import { NextRequest, NextResponse } from "next/server";
import { checkAndDispatchClassReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const result = await checkAndDispatchClassReminders();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("GET /api/classes/reminders error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to run class reminders check." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await checkAndDispatchClassReminders();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/classes/reminders error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to trigger class reminders." },
      { status: 500 }
    );
  }
}
