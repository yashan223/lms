import { NextResponse, NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  validateStudentRescheduleEligibility,
  getStudentRescheduleQuota,
  createStudentRescheduleRequest,
  acceptRescheduleRequest,
  declineRescheduleRequest,
  getTutorPendingReschedules,
  MAX_STUDENT_RESCHEDULES_PER_MONTH,
  MIN_RESCHEDULE_NOTICE_HOURS,
} from "@/lib/reschedule";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (auth.user.role === Role.STUDENT) {
      const quota = await getStudentRescheduleQuota(auth.user.id);
      let eligibility = null;

      if (eventId) {
        eligibility = await validateStudentRescheduleEligibility({
          studentId: auth.user.id,
          eventId,
        });
      }

      return NextResponse.json({
        quota,
        eligibility,
        rules: {
          maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
          minNoticeHours: MIN_RESCHEDULE_NOTICE_HOURS,
        },
      });
    }

    // Tutor / Admin view
    const pendingRequests = await getTutorPendingReschedules(auth.user.id);
    return NextResponse.json({
      pendingRequests,
      count: pendingRequests.length,
    });
  } catch (error: any) {
    console.error("Reschedule API GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch reschedule information." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    // 1. Student requests a reschedule
    if (action === "request_reschedule") {
      if (auth.user.role !== Role.STUDENT && auth.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: "Only students can submit reschedule requests." }, { status: 403 });
      }

      const { eventId, scheduledDate, reason, timezone } = body;
      if (!eventId || !scheduledDate) {
        return NextResponse.json({ error: "Event ID and requested date are required." }, { status: 400 });
      }

      const result = await createStudentRescheduleRequest({
        studentId: auth.user.id,
        eventId,
        requestedDate: new Date(scheduledDate),
        studentReason: reason,
        timezone,
      });

      return NextResponse.json(result);
    }

    // 2. Tutor accepts reschedule request
    if (action === "accept_reschedule") {
      const { requestId, responseNote } = body;
      if (!requestId) {
        return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
      }

      const result = await acceptRescheduleRequest({
        requestId,
        tutorId: auth.user.id,
        responseNote,
      });

      return NextResponse.json(result);
    }

    // 3. Tutor declines reschedule request
    if (action === "decline_reschedule") {
      const { requestId, responseNote } = body;
      if (!requestId) {
        return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
      }

      const result = await declineRescheduleRequest({
        requestId,
        tutorId: auth.user.id,
        responseNote,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Reschedule API POST error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Failed to process reschedule action.", code: error.code },
      { status: statusCode }
    );
  }
}
