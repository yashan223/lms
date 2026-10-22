import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { evaluateAndProcessClassPayout } from "@/lib/token-ecosystem";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, force } = body;

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const result = await evaluateAndProcessClassPayout(eventId, {
      force: Boolean(force),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Payout check error:", error);
    return NextResponse.json({ error: error?.message || "Failed to check payout" }, { status: 500 });
  }
}
