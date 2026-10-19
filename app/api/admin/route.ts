import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink, isGenericMeetingLink } from "@/lib/utils";
import { getAuthenticatedUser, hashPassword } from "@/lib/auth";
import { getBundles, saveBundles, DEFAULT_BUNDLES } from "@/lib/bundles";
import {
  getSubjects as getSchools,
  createSubject as createSchool,
  updateSubject as updateSchool,
  deleteSubject as deleteSchool,
  reorderSubjects as reorderSchools,
  resetDefaultSubjects as resetDefaultSchools,
} from "@/lib/subjects";
import { getRegionalTimezone, DEFAULT_TIMEZONE } from "@/lib/timezones";
import {
  syncClassMeetingSession,
  createBBBMeeting,
  getBBBJoinUrl,
  getBBBMeetingId,
  getUniversalJoinLink,
  endBBBMeeting,
  isBigBlueButtonConfigured,
} from "@/lib/bigbluebutton";
import { Role, CourseLevel, CourseStatus, EventType, EventStatus, TrialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACTION_CATEGORY_MAP: Record<string, string> = {
  create_user: "USER", create_candidate: "USER",
  update_user: "USER", delete_user: "USER", delete_candidate: "USER",
  enroll_user: "USER", unenroll_user: "USER",
  grant_tokens: "FINANCE", give_credit: "FINANCE", adjust_tokens: "FINANCE",
  create_course: "COURSE", update_course: "COURSE", delete_course: "COURSE",
  add_module: "COURSE", delete_module: "COURSE",
  add_lesson: "COURSE", delete_lesson: "COURSE",
  add_course_material: "COURSE", delete_course_material: "COURSE",
  approve_course: "COURSE", reject_course: "COURSE",
  create_school: "COURSE", update_school: "COURSE", delete_school: "COURSE",
  reorder_schools: "COURSE", reset_schools: "COURSE",
  create_subject: "COURSE", update_subject: "COURSE", delete_subject: "COURSE",
  reorder_subjects: "COURSE", reset_subjects: "COURSE",
  start_class: "CLASS", end_class: "CLASS",
  approve_class: "CLASS", reject_class: "CLASS",
  delete_assessment: "CLASS", delete_event: "CLASS", create_mock_paper: "CLASS",
  approve_trial: "TRIAL", reject_trial: "TRIAL", reset_trial: "TRIAL", reset_student_trial: "TRIAL", reset_student_trials: "TRIAL", delete_trial: "TRIAL",
  update_bundles: "PRICING",
  clear_all_data: "GENERAL",
};

async function clearLocalStorageUploads(): Promise<void> {
  try {
    const storageDir = process.env.STORAGE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads");
    const subdirs = ["public", "private"];
    for (const sub of subdirs) {
      const fullPath = path.join(/*turbopackIgnore: true*/ storageDir, sub);
      if (fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
        const files = fs.readdirSync(/*turbopackIgnore: true*/ fullPath);
        for (const file of files) {
          if (file === ".gitkeep") continue;
          try {
            const filePath = path.join(/*turbopackIgnore: true*/ fullPath, file);
            if (fs.statSync(/*turbopackIgnore: true*/ filePath).isFile()) {
              fs.unlinkSync(/*turbopackIgnore: true*/ filePath);
            }
          } catch (e) {
            console.error(`[storage] Failed to delete storage file ${file}:`, e);
          }
        }
      }
    }
  } catch (err) {
    console.error("[storage] Storage directory cleanup error:", err);
  }
}

async function writeAuditLog(opts: {
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string | null;
  targetLabel?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}) {
  const category = ACTION_CATEGORY_MAP[opts.action] ?? "GENERAL";
  try {
    await prisma.auditLog.create({
      data: {
        adminId: opts.adminId,
        adminEmail: opts.adminEmail,
        action: opts.action,
        category,
        targetId: opts.targetId ?? null,
        targetLabel: opts.targetLabel ?? null,
        details: opts.details ? (opts.details as any) : undefined,
        ipAddress: opts.ipAddress ?? null,
      },
    });
    broadcastLMSEvent("AUDIT_LOG_CHANGED", { action: opts.action, category, adminEmail: opts.adminEmail });
  } catch (auditErr) {
    console.error("[AuditLog] Failed to write audit log entry:", auditErr);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    let allUsers: any[] = [];
    let courses: any[] = [];
    let events: any[] = [];
    let privateFiles: any[] = [];

    try {
      allUsers = await prisma.user.findMany({
        include: {
          tokenWallet: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
            },
          },
          enrollments: {
            include: { course: true },
          },
          createdCourses: true,
          events: true,
          badges: true,
          studentTrials: {
            include: {
              tutor: { select: { id: true, name: true, email: true, avatar: true } },
              course: { select: { id: true, title: true, subjectCode: true } },
            },
            orderBy: { preferredDate: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (uErr) {
      console.error("Error fetching users with relations:", uErr);
      allUsers = await prisma.user.findMany().catch(() => []);
    }

    try {
      courses = await prisma.course.findMany({
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
              headline: true,
              bio: true,
            },
          },
          modules: {
            include: { lessons: true },
            orderBy: { position: "asc" },
          },
          materials: {
            orderBy: { createdAt: "desc" },
          },
          enrollments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  avatar: true,
                  headline: true,
                },
              },
            },
            orderBy: { enrolledAt: "desc" },
          },
          events: {
            orderBy: { dueDate: "desc" },
          },
          reviews: {
            include: { user: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (cErr) {
      console.error("Error fetching courses with relations:", cErr);
      courses = await prisma.course.findMany().catch(() => []);
    }

    try {
      events = await prisma.event.findMany({
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
        orderBy: { dueDate: "asc" },
      });
    } catch (eErr) {
      console.error("Error fetching events:", eErr);
      events = await prisma.event.findMany().catch(() => []);
    }

    try {
      privateFiles = await prisma.privateFile.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (fErr) {
      console.error("Error fetching private files in admin:", fErr);
      privateFiles = [];
    }

    let pendingClasses: any[] = [];
    let pendingTrials: any[] = [];
    let pendingCourses: any[] = [];

    try {
      pendingClasses = await prisma.event.findMany({
        where: { status: EventStatus.PENDING_APPROVAL },
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (pcErr) {
      console.error("Error fetching pending classes:", pcErr);
      pendingClasses = [];
    }

    try {
      pendingTrials = await prisma.trialRequest.findMany({
        where: { status: TrialStatus.PENDING_APPROVAL },
        include: {
          course: {
            include: { tutor: true },
          },
          tutor: true,
          student: true,
        },
        orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      });
    } catch (ptErr) {
      console.error("Error fetching pending trials:", ptErr);
      pendingTrials = [];
    }

    let allTrials: any[] = [];
    try {
      allTrials = await prisma.trialRequest.findMany({
        include: {
          course: {
            include: { tutor: true },
          },
          tutor: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          student: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: [{ createdAt: "desc" }, { preferredDate: "desc" }],
      });
    } catch (atErr) {
      console.error("Error fetching all trials in admin:", atErr);
      allTrials = [];
    }

    try {
      pendingCourses = await prisma.course.findMany({
        where: { status: CourseStatus.PENDING_REVIEW },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
              headline: true,
              bio: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (pcrErr) {
      console.error("Error fetching pending courses:", pcrErr);
      pendingCourses = [];
    }

    const sanitizedUsers = allUsers.map(({ passwordHash, ...safeUser }) => safeUser);
    const candidates = sanitizedUsers.filter((u) => u.role === Role.STUDENT);
    const tutors = sanitizedUsers.filter((u) => u.role === Role.TUTOR || (u.role as any) === "INSTRUCTOR");
    const admins = sanitizedUsers.filter((u) => u.role === Role.ADMIN);

    const adminName =
      auth.user.name ||
      process.env.DEFAULT_ADMIN_NAME ||
      "Administrator";

    const adminProfile = {
      id: auth.user.id,
      name: adminName,
      email: auth.user.email,
      role: auth.user.role,
      avatar: auth.user.avatar || null,
    };

    const totalPendingApprovals =
      pendingClasses.length + pendingTrials.length + pendingCourses.length;

    return NextResponse.json({
      adminProfile,
      allUsers: sanitizedUsers,
      candidates,
      tutors,
      faculty: tutors,
      admins,
      courses,
      events,
      privateFiles,
      pendingClasses,
      pendingTrials,
      allTrials,
      pendingCourses,
      totalPendingApprovals,
      bundles: await getBundles(),
      schools: await getSchools(false),
      subjects: await getSchools(false),
    });
  } catch (error: any) {
    console.error("Admin API GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const targetLabel =
      body.name || body.title || body.email ||
      body.courseId || body.userId || body.eventId || body.trialId ||
      body.materialId || body.moduleId || body.lessonId || body.bundleId || null;
    writeAuditLog({
      adminId: auth.user.id,
      adminEmail: auth.user.email,
      action,
      targetId: body.userId || body.courseId || body.eventId || body.trialId || body.materialId || body.moduleId || body.lessonId || null,
      targetLabel: typeof targetLabel === "string" ? targetLabel : null,
      details: { body: { ...body, password: body.password ? "[REDACTED]" : undefined } },
      ipAddress,
    });

    if (action === "create_user" || action === "create_candidate") {
      const { name, email, password, phone, role, headline, bio, initialCourseId, hourlyRate, hourlyRateAL, hourlyRateOL, isALTutor, isOLTutor, timezone, country } = body;
      const assignedRole = (role as Role) || Role.TUTOR;

      if (assignedRole === Role.STUDENT) {
        return NextResponse.json(
          { error: "Students cannot be created manually by administrators. Students must register via the student portal." },
          { status: 400 }
        );
      }

      if (!email || typeof email !== "string" || !email.trim()) {
        return NextResponse.json({ error: "An email address is required for every user account." }, { status: 400 });
      }

      const rawPassword = password || (assignedRole === Role.ADMIN ? "AdminPass123!" : "TutorPass123!");
      const hashedPassword = hashPassword(rawPassword);

      const resolvedTimezone = timezone
        ? getRegionalTimezone(timezone).id
        : country
        ? getRegionalTimezone(country).id
        : DEFAULT_TIMEZONE;

      let initialBio = bio ? bio.trim() : "";
      if (assignedRole === Role.TUTOR || (assignedRole as any) === "INSTRUCTOR") {
        const resolvedAL = String(hourlyRateAL || hourlyRate || "5000").trim();
        const resolvedOL = String(hourlyRateOL || "3500").trim();
        try {
          const parsed = initialBio.trim().startsWith("{") ? JSON.parse(initialBio) : { about: initialBio };
          parsed.hourlyRate = resolvedAL;
          parsed.hourlyRateAL = resolvedAL;
          parsed.hourlyRateOL = resolvedOL;
          parsed.isALTutor = isALTutor !== undefined ? Boolean(isALTutor) : true;
          parsed.isOLTutor = isOLTutor !== undefined ? Boolean(isOLTutor) : true;
          initialBio = JSON.stringify(parsed);
        } catch {
          initialBio = JSON.stringify({
            about: initialBio,
            hourlyRate: resolvedAL,
            hourlyRateAL: resolvedAL,
            hourlyRateOL: resolvedOL,
            isALTutor: isALTutor !== undefined ? Boolean(isALTutor) : true,
            isOLTutor: isOLTutor !== undefined ? Boolean(isOLTutor) : true,
          });
        }
      }

      const primaryUserEmail = email.trim().toLowerCase();

      const newUser = await prisma.user.create({
        data: {
          name,
          email: primaryUserEmail,
          passwordHash: hashedPassword,
          role: assignedRole,
          emailVerified: assignedRole === Role.TUTOR ? null : new Date(),
          phone: phone ? phone.trim() : null,
          country: country ? country.trim() : null,
          timezone: resolvedTimezone,
          headline: headline || (assignedRole === Role.ADMIN ? "System Administrator" : "Senior Tutor"),
          bio: initialBio,
          avatar: null,
        },
      });

      broadcastLMSEvent("USERS_CHANGED");
      const { passwordHash: _ph, ...safeNewUser } = newUser;
      return NextResponse.json({
        success: true,
        user: safeNewUser,
        requiresVerification: assignedRole === Role.TUTOR,
        message: assignedRole === Role.TUTOR
          ? "Tutor account created successfully. The verification email will be dispatched when the tutor logs in for the first time."
          : "User account created successfully.",
      });
    }

    if (action === "update_user") {
      const { userId, name, email, phone, role, headline, bio, password, hourlyRate, hourlyRateAL, hourlyRateOL, isALTutor, isOLTutor, timezone, country } = body;

      let finalBio = bio;
      if (hourlyRate !== undefined || hourlyRateAL !== undefined || hourlyRateOL !== undefined || isALTutor !== undefined || isOLTutor !== undefined) {
        let parsedBio: any = {};
        try {
          if (finalBio && typeof finalBio === "string" && finalBio.trim().startsWith("{")) {
            parsedBio = JSON.parse(finalBio);
          } else {
            const existing = await prisma.user.findUnique({ where: { id: userId }, select: { bio: true } });
            if (existing?.bio && existing.bio.trim().startsWith("{")) {
              parsedBio = JSON.parse(existing.bio);
            } else if (finalBio) {
              parsedBio = { about: finalBio };
            }
          }
        } catch {
          parsedBio = { about: finalBio || "" };
        }
        const resolvedAL = String(hourlyRateAL || hourlyRate || parsedBio.hourlyRateAL || parsedBio.hourlyRate || "5000").trim();
        const resolvedOL = String(hourlyRateOL || parsedBio.hourlyRateOL || "3500").trim();
        parsedBio.hourlyRate = resolvedAL;
        parsedBio.hourlyRateAL = resolvedAL;
        parsedBio.hourlyRateOL = resolvedOL;
        if (isALTutor !== undefined) parsedBio.isALTutor = Boolean(isALTutor);
        if (isOLTutor !== undefined) parsedBio.isOLTutor = Boolean(isOLTutor);
        finalBio = JSON.stringify(parsedBio);
      }

      const updateData: any = {
        name,
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        role: (role as Role) || Role.STUDENT,
        headline,
        bio: finalBio,
      };
      if (password && password.trim()) {
        updateData.passwordHash = hashPassword(password.trim());
      }
      if (timezone !== undefined) {
        updateData.timezone = timezone ? getRegionalTimezone(timezone).id : DEFAULT_TIMEZONE;
      }
      if (country !== undefined) {
        updateData.country = country ? country.trim() : null;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      if (updateData.timezone && (updateData.role === Role.TUTOR || (updateData.role as any) === "INSTRUCTOR")) {
        await prisma.tutorAvailability.updateMany({
          where: { tutorId: userId },
          data: { timezone: updateData.timezone },
        });
      }

      const { passwordHash: _uph, ...safeUpdatedUser } = updatedUser;
      broadcastLMSEvent("USERS_CHANGED");
      return NextResponse.json({ success: true, user: safeUpdatedUser });
    }

    if (action === "delete_user" || action === "delete_candidate") {
      const { userId, candidateId } = body;
      const targetId = userId || candidateId;
      await prisma.user.delete({ where: { id: targetId } });
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "grant_tokens" || action === "give_credit" || action === "adjust_tokens") {
      const { userId, amount, reason, mode } = body;
      const parsedAmount = parseFloat(amount);

      if (!userId) {
        return NextResponse.json({ error: "Student user ID is required." }, { status: 400 });
      }

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: "Token / credit amount must be a positive number." }, { status: 400 });
      }

      const targetStudent = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetStudent) {
        return NextResponse.json({ error: "Student user account not found." }, { status: 404 });
      }

      let wallet = await prisma.tokenWallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await prisma.tokenWallet.create({
          data: {
            userId,
            balance: 0,
          },
        });
      }

      const description = reason?.trim() || `Admin Grant: ${parsedAmount} Free Learning Hours Credit`;

      const updatedWallet = await prisma.$transaction(async (tx) => {
        let newBalance = wallet.balance;
        let txAmount = parsedAmount;

        if (mode === "SET") {
          newBalance = parsedAmount;
          txAmount = parsedAmount - wallet.balance;
        } else if (mode === "DEDUCT") {
          newBalance = Math.max(0, wallet.balance - parsedAmount);
          txAmount = -parsedAmount;
        } else {
          newBalance = wallet.balance + parsedAmount;
          txAmount = parsedAmount;
        }

        const w = await tx.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: newBalance,
          },
        });

        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            amount: txAmount,
            type: mode === "DEDUCT" ? "SPEND" : "BONUS",
            description,
          },
        });

        return w;
      });

      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId });

      return NextResponse.json({
        success: true,
        message: `Successfully granted ${parsedAmount} free learning hour tokens to ${targetStudent.name}! Updated balance: ${updatedWallet.balance} Hours.`,
        wallet: updatedWallet,
      });
    }

    if (action === "enroll_user") {
      const { userId, courseId } = body;
      const existing = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (!existing) {
        await prisma.enrollment.create({
          data: { userId, courseId },
        });
      }
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "unenroll_user") {
      const { enrollmentId, userId, courseId } = body;
      if (enrollmentId) {
        await prisma.enrollment.delete({ where: { id: enrollmentId } });
      } else if (userId && courseId) {
        await prisma.enrollment.deleteMany({
          where: { userId, courseId },
        });
      }
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Student unenrolled successfully." });
    }

    if (action === "create_course") {
      const { title, slug, subtitle, description, category, subjectCode, price, olPrice, tokens, tutorId, instructorId, level, status, thumbnail, featured } = body;

      let finalTutorId = tutorId || instructorId;
      if (!finalTutorId) {
        const firstTutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } }) || await prisma.user.findFirst({ where: { role: (Role as any).INSTRUCTOR } });
        finalTutorId = firstTutor?.id;
      }

      const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${Date.now()}`;
      const tokenValue = tokens !== undefined ? parseFloat(tokens) : (price !== undefined ? parseFloat(price) : 0);
      const olTokenValue = olPrice !== undefined && olPrice !== null && olPrice !== "" && !isNaN(parseFloat(olPrice)) ? parseFloat(olPrice) : null;

      const newCourse = await prisma.course.create({
        data: {
          title,
          slug: generatedSlug,
          subtitle: subtitle || "Official Academic Curriculum Individual Class.",
          description: description || "Comprehensive lesson walkthroughs, unit proofs, and coursework solutions.",
          category: category || "Mathematics & Computing",
          subjectCode: subjectCode || "MATH-101",
          price: isNaN(tokenValue) ? 0 : tokenValue,
          olPrice: olTokenValue,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: (status as CourseStatus) || CourseStatus.PUBLISHED,
          tutorId: finalTutorId,
          thumbnail: thumbnail || null,
          featured: featured !== undefined ? Boolean(featured) : false,
          modules: {
            create: [
              {
                title: "Module 1: Foundations & Theoretical Proofs",
                position: 1,
                lessons: {
                  create: [
                    { title: "Lesson 1: Syllabus Breakdown & Unit Overview", durationMin: 25, position: 1, isFreePreview: true },
                    { title: "Lesson 2: Core Proofs & Methods", durationMin: 35, position: 2, isFreePreview: true },
                  ],
                },
              },
            ],
          },
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, course: newCourse });
    }

    if (action === "update_course") {
      const { courseId, title, subtitle, description, category, subjectCode, price, olPrice, tokens, level, status, tutorId, instructorId, thumbnail, featured } = body;
      const tokenValue = tokens !== undefined ? parseFloat(tokens) : (price !== undefined ? parseFloat(price) : 0);
      const olTokenValue = olPrice !== undefined ? (olPrice !== null && olPrice !== "" && !isNaN(parseFloat(olPrice)) ? parseFloat(olPrice) : null) : undefined;
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          title,
          subtitle,
          description,
          category,
          subjectCode,
          thumbnail: thumbnail !== undefined ? (typeof thumbnail === "string" && thumbnail.trim() ? thumbnail.trim() : null) : undefined,
          featured: featured !== undefined ? Boolean(featured) : undefined,
          price: isNaN(tokenValue) ? 0 : tokenValue,
          olPrice: olTokenValue,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: (status as CourseStatus) || CourseStatus.PUBLISHED,
          tutorId: tutorId || instructorId || undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, course: updatedCourse });
    }

    if (action === "delete_course") {
      const { courseId } = body;
      await prisma.course.delete({ where: { id: courseId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "add_module") {
      const { courseId, title, position } = body;
      const newModule = await prisma.module.create({
        data: {
          courseId,
          title,
          position: position || 2,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, module: newModule });
    }

    if (action === "update_module") {
      const { moduleId, title, position } = body;
      const updatedModule = await prisma.module.update({
        where: { id: moduleId },
        data: {
          title: title !== undefined ? title : undefined,
          position: position !== undefined ? parseInt(position) : undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, module: updatedModule });
    }

    if (action === "delete_module") {
      const { moduleId } = body;
      await prisma.module.delete({ where: { id: moduleId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "add_lesson") {
      const { moduleId, title, durationMin, isFreePreview, videoUrl } = body;
      const count = await prisma.lesson.count({ where: { moduleId } });
      const newLesson = await prisma.lesson.create({
        data: {
          moduleId,
          title,
          durationMin: parseInt(durationMin) || 30,
          position: count + 1,
          isFreePreview: Boolean(isFreePreview),
          videoUrl: videoUrl ? videoUrl.trim() : null,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, lesson: newLesson });
    }

    if (action === "update_lesson") {
      const { lessonId, title, durationMin, isFreePreview, videoUrl, position } = body;
      const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          title: title !== undefined ? title : undefined,
          durationMin: durationMin !== undefined ? (parseInt(durationMin) || 30) : undefined,
          isFreePreview: isFreePreview !== undefined ? Boolean(isFreePreview) : undefined,
          videoUrl: videoUrl !== undefined ? videoUrl : undefined,
          position: position !== undefined ? parseInt(position) : undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, lesson: updatedLesson });
    }

    if (action === "delete_lesson") {
      const { lessonId } = body;
      await prisma.lesson.delete({ where: { id: lessonId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "schedule_class" || action === "create_class") {
      const { title, description, dueDate, courseId, meetingLink } = body;
      const targetDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      let tutorEmail: string | undefined = undefined;
      let tutorName: string | undefined = undefined;
      if (courseId) {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { tutor: true },
        });
        if (course?.tutor) {
          tutorEmail = course.tutor.email;
          tutorName = course.tutor.name || undefined;
        }
      }

      const tempId = `class-${Date.now()}`;
      let meetLink =
        meetingLink?.trim() && !isGenericMeetingLink(meetingLink)
          ? getSafeMeetingLink(meetingLink)
          : getUniversalJoinLink({ eventId: tempId });

      const newEvent = await prisma.event.create({
        data: {
          title: title || "Scheduled Live Class",
          description: description || null,
          type: "LIVE_SEMINAR",
          status: "SCHEDULED",
          meetingLink: meetLink,
          meetingSpaceId: tempId,
          dueDate: targetDate,
          courseId: courseId || null,
          approvalStatus: "APPROVED",
        },
      });

      const canonicalId = getBBBMeetingId({ eventId: newEvent.id });
      const canonicalLink = getUniversalJoinLink({ eventId: newEvent.id });
      if (meetLink.includes(tempId)) {
        await prisma.event.update({
          where: { id: newEvent.id },
          data: { meetingLink: canonicalLink, meetingSpaceId: canonicalId },
        });
        meetLink = canonicalLink;
      }

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: canonicalId,
            name: title || "Scheduled Live Class",
            record: true,
          });
        } catch (e) {
          console.warn("[Admin API] createBBBMeeting notice:", e);
        }
      }

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, event: newEvent, meetingLink: meetLink });
    }

    if (action === "create_mock_paper" || action === "create_assessment") {
      const { title, description, dueDate, courseId, paperCode, durationMins, totalMarks } = body;
      const newMock = await prisma.event.create({
        data: {
          title: title || `Workshop: ${paperCode || "Curriculum Unit Practice"}`,
          description: description || `Interactive academic session (${durationMins || 90} mins).`,
          type: EventType.DEADLINE,
          dueDate: new Date(dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
          courseId: courseId || null,
        },
      });
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, mock: newMock });
    }

    if (action === "delete_assessment" || action === "delete_event" || action === "delete_class") {
      const { eventId } = body;
      await prisma.event.delete({ where: { id: eventId } });
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "add_course_material") {
      const { courseId, title, description, fileUrl, fileSize, fileType, category } = body;
      if (!courseId || !title || !fileUrl) {
        return NextResponse.json({ error: "Course, title, and file are required" }, { status: 400 });
      }
      const material = await prisma.courseMaterial.create({
        data: {
          courseId,
          title,
          description: description || null,
          fileUrl,
          fileSize: fileSize || "1.5 MB",
          fileType: fileType || "application/pdf",
          category: category || "HANDOUT",
        },
      });
      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, material });
    }

    if (action === "delete_course_material") {
      const { materialId } = body;
      const existing = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
      if (existing && existing.fileUrl.startsWith("/api/files/")) {
        const fileKey = existing.fileUrl.replace("/api/files/", "");
        await deleteStorageFile(fileKey);
      }
      await prisma.courseMaterial.delete({ where: { id: materialId } });
      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "start_class") {
      const { eventId, meetingLink } = body;
      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
      });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      const bbbId = existing.meetingSpaceId || getBBBMeetingId({ eventId });
      const studentJoinLink = getUniversalJoinLink({ eventId });
      const moderatorJoinUrl = getBBBJoinUrl({
        meetingId: bbbId,
        fullName: existing.course?.tutor?.name || "Administrator",
        isModerator: true,
        userId: existing.course?.tutorId || undefined,
      });

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbId,
            name: existing.title || "PulseEDU Live Class",
            record: true,
            autoStartRecording: true,
            allowStartStopRecording: true,
          });
        } catch (err: any) {
          console.warn("[Admin API] createBBBMeeting notice:", err?.message || err);
        }
      }

      const rawCandidate = meetingLink || existing.meetingLink;
      const effectiveStudentLink =
        rawCandidate && !isGenericMeetingLink(rawCandidate)
          ? getSafeMeetingLink(rawCandidate)
          : studentJoinLink;

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "LIVE",
          startedAt: new Date(),
          meetingLink: effectiveStudentLink,
          meetingSpaceId: bbbId,
        },
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED", {
        classLive: true,
        eventId: updated.id,
        title: updated.title,
        meetingLink: effectiveStudentLink,
      });

      return NextResponse.json({
        success: true,
        message: "Live class session has been started!",
        event: updated,
        meetingLink: moderatorJoinUrl,
      });
    }

    if (action === "end_class") {
      const { eventId, recordingUrl, manualStartTime, manualEndTime } = body;
      if (!eventId) {
        return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
      }

      const bbbId = getBBBMeetingId({ eventId });
      if (isBigBlueButtonConfigured()) {
        endBBBMeeting(bbbId).catch(() => {});
      }

      const syncResult = await syncClassMeetingSession(eventId, {
        manualStartTime: manualStartTime ? new Date(manualStartTime) : undefined,
        manualEndTime: manualEndTime ? new Date(manualEndTime) : new Date(),
        manualRecordingUrl: recordingUrl ? recordingUrl.trim() : undefined,
      });

      return NextResponse.json({
        success: true,
        message: syncResult.message || "Live class session marked as completed.",
        event: syncResult.event,
      });
    }

    if (action === "approve_class") {
      const { eventId } = body;
      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: { course: { include: { tutor: true } }, user: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
        },
        include: { course: { include: { tutor: true } }, user: true },
      });

      const tutorId = existing.requestedBy || existing.course?.tutorId;
      if (tutorId) {
        await prisma.notification.create({
          data: {
            userId: tutorId,
            title: "✅ Live Class Approved!",
            message: `Your class session "${updated.title}" scheduled for ${new Date(updated.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} was approved by Admin and is now live on student calendars.`,
            type: "SUCCESS",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutorId });
      }

      if (updated.courseId) {
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: updated.courseId },
          select: { userId: true },
        });
        if (enrollments.length > 0) {
          await prisma.notification.createMany({
            data: enrollments.map((e) => ({
              userId: e.userId,
              title: "📅 New Live Class Scheduled",
              message: `"${updated.title}" has been approved and scheduled for ${new Date(updated.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`,
              type: "INFO",
              link: "/dashboard",
            })),
          });
          enrollments.forEach((e) => broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: e.userId }));
        }
      } else if (updated.userId) {
        await prisma.notification.create({
          data: {
            userId: updated.userId,
            title: "📅 Live Session Scheduled",
            message: `"${updated.title}" has been approved and scheduled for ${new Date(updated.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`,
            type: "INFO",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.userId });
      }

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Live class approved and published successfully!", event: updated });
    }

    if (action === "reject_class") {
      const { eventId, reason } = body;
      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: { course: { include: { tutor: true } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      const rejectionReason = reason?.trim() || "Class session proposal was declined by administrator.";
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.REJECTED,
          approvalStatus: "REJECTED",
          rejectionReason,
        },
      });

      const tutorId = existing.requestedBy || existing.course?.tutorId;
      if (tutorId) {
        await prisma.notification.create({
          data: {
            userId: tutorId,
            title: "❌ Live Class Request Declined",
            message: `Your schedule request for "${existing.title}" was declined by Admin. Reason: ${rejectionReason}`,
            type: "ALERT",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutorId });
      }

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Class session declined.", event: updated });
    }

    if (action === "approve_trial") {
      const { trialId } = body;
      const existing = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Trial request not found" }, { status: 404 });
      }

      const updated = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: TrialStatus.CONFIRMED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
        },
        include: { course: true, tutor: true, student: true },
      });

      const courseTitle = updated.course?.title || "London A/L Tutorial Individual Class";
      const courseCode = updated.course?.subjectCode || "";
      const eventTitle = `30-Min Free Trial: ${courseTitle} (${updated.studentName})`;
      const bbbId = updated.meetingSpaceId || getBBBMeetingId({ trialId });
      const link =
        updated.meetingLink && !isGenericMeetingLink(updated.meetingLink)
          ? getSafeMeetingLink(updated.meetingLink)
          : getUniversalJoinLink({ trialId });

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbId,
            name: eventTitle,
            record: true,
          });
        } catch (e) {
          console.warn("[Admin API] approve_trial BBB notice:", e);
        }
      }

      await prisma.trialRequest.update({
        where: { id: trialId },
        data: { meetingLink: link, meetingSpaceId: bbbId },
      });

      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Senior Tutor.`,
        `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
        `Topic / Focus: ${updated.topic || "30-Min Free Trial & Syllabus Overview"}`,
        `Student: ${updated.studentName} (${updated.studentEmail})`,
        `Classroom Link: ${link}`,
        updated.notes ? `Tutor Notes: ${updated.notes}` : "",
      ].filter(Boolean).join("\n\n");

      if (updated.courseId) {
        await prisma.event.deleteMany({
          where: {
            courseId: updated.courseId,
            title: { contains: updated.studentName },
          },
        });
      }

      await prisma.event.create({
        data: {
          title: eventTitle,
          description: eventDescription,
          dueDate: updated.preferredDate,
          type: EventType.LIVE_SEMINAR,
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          meetingLink: link,
          meetingSpaceId: bbbId,
          courseId: updated.courseId || null,
          userId: updated.studentId || updated.tutorId || null,
        },
      });

      if (updated.studentId) {
        const dateStr = new Date(updated.preferredDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        await prisma.notification.create({
          data: {
            userId: updated.studentId,
            title: "🎉 Free Trial Confirmed!",
            message: `Your trial session for "${courseTitle}" has been approved and confirmed for ${dateStr}. BigBlueButton classroom link is ready on your dashboard!`,
            type: "SUCCESS",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.studentId });
      }

      if (updated.tutorId) {
        await prisma.notification.create({
          data: {
            userId: updated.tutorId,
            title: "✅ Trial Session Approved by Admin",
            message: `Trial session with ${updated.studentName} has been approved and scheduled on the student's calendar.`,
            type: "SUCCESS",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.tutorId });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Trial session approved and scheduled successfully!", trial: updated });
    }

    if (action === "reject_trial") {
      const { trialId, reason } = body;
      const existing = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Trial request not found" }, { status: 404 });
      }

      const rejectionReason = reason?.trim() || "Trial session declined by administrator.";
      const updated = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: TrialStatus.REJECTED,
          approvalStatus: "REJECTED",
          rejectionReason,
        },
      });

      if (existing.tutorId) {
        await prisma.notification.create({
          data: {
            userId: existing.tutorId,
            title: "❌ Trial Request Declined",
            message: `Trial request for ${existing.studentName} was declined by Admin. Reason: ${rejectionReason}`,
            type: "ALERT",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: existing.tutorId });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      return NextResponse.json({ success: true, message: "Trial request declined.", trial: updated });
    }

    if (action === "reset_student_trial" || action === "reset_trial") {
      const { trialId } = body;
      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }

      const trial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { tutor: true, student: true, course: { include: { tutor: true } } },
      });

      if (!trial) {
        return NextResponse.json({ error: "Trial request not found." }, { status: 404 });
      }

      const tutorName = trial.tutor?.name || trial.course?.tutor?.name || "Assigned Tutor";

      // 1. Delete any linked calendar event
      await prisma.event.deleteMany({
        where: {
          description: { contains: trialId },
        },
      }).catch(() => {});

      // 2. Set status to CANCELLED and update notes so it's excluded from active trials filter
      const updated = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: TrialStatus.CANCELLED,
          approvalStatus: "RESET",
          rejectionReason: null,
          meetingLink: null,
          notes: trial.notes
            ? `${trial.notes} | [Admin Reset] Reset by Admin on ${new Date().toLocaleDateString()} to allow re-booking with ${tutorName}.`
            : `[Admin Reset] Reset by Admin on ${new Date().toLocaleDateString()} to allow re-booking with ${tutorName}.`,
        },
      });

      // 3. Notify student if studentId is present
      if (trial.studentId) {
        await prisma.notification.create({
          data: {
            userId: trial.studentId,
            title: "✨ Free Trial Reset by Administrator",
            message: `Your trial consultation with ${tutorName} has been reset. You are now free to request a new trial session with ${tutorName}!`,
            type: "SUCCESS",
            link: "/classes",
          },
        }).catch(() => {});
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: trial.studentId });
      }

      // 4. Audit Log
      await writeAuditLog({
        adminId: auth.user.id,
        adminEmail: auth.user.email,
        action: "reset_trial",
        targetId: trialId,
        targetLabel: `Trial for ${trial.studentName} with ${tutorName}`,
        details: { trialId, studentId: trial.studentId, tutorId: trial.tutorId, studentEmail: trial.studentEmail },
      });

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: `Trial session reset successfully. ${trial.studentName} can now request a trial with ${tutorName} again.`,
        trial: updated,
      });
    }

    if (action === "reset_student_trials") {
      const { studentId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
      }

      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true },
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      const studentTrials = await prisma.trialRequest.findMany({
        where: {
          OR: [
            { studentId },
            { studentEmail: student.email },
          ],
        },
      });

      for (const t of studentTrials) {
        await prisma.event.deleteMany({
          where: { description: { contains: t.id } },
        }).catch(() => {});
      }

      await prisma.trialRequest.updateMany({
        where: {
          OR: [
            { studentId },
            { studentEmail: student.email },
          ],
        },
        data: {
          status: TrialStatus.CANCELLED,
          approvalStatus: "RESET",
          rejectionReason: null,
          meetingLink: null,
        },
      });

      await prisma.notification.create({
        data: {
          userId: student.id,
          title: "✨ All Free Trials Reset by Administrator",
          message: "All your free trial consultation limits have been reset by the administrator. You can now request new free trials with your preferred tutors!",
          type: "SUCCESS",
          link: "/classes",
        },
      }).catch(() => {});

      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: student.id });

      await writeAuditLog({
        adminId: auth.user.id,
        adminEmail: auth.user.email,
        action: "reset_student_trials",
        targetId: studentId,
        targetLabel: `All trials for student ${student.name}`,
        details: { studentId, studentEmail: student.email, count: studentTrials.length },
      });

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: `All trials for ${student.name} have been reset successfully. The student can now request free trials with any tutor again.`,
      });
    }

    if (action === "delete_trial") {
      const { trialId } = body;
      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }
      await prisma.event.deleteMany({
        where: { description: { contains: trialId } },
      }).catch(() => {});
      await prisma.trialRequest.delete({ where: { id: trialId } });
      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Trial request permanently deleted." });
    }

    if (action === "approve_course") {
      const { courseId } = body;
      const updated = await prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.PUBLISHED },
        include: { tutor: true },
      });
      if (updated.tutorId) {
        await prisma.notification.create({
          data: {
            userId: updated.tutorId,
            title: "🎉 Course Approved & Published!",
            message: `Your course "${updated.title}" has been approved and is now live for student enrollments.`,
            type: "SUCCESS",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.tutorId });
      }
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Course published successfully!", course: updated });
    }

    if (action === "reject_course") {
      const { courseId, reason } = body;
      const updated = await prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.DRAFT },
        include: { tutor: true },
      });
      if (updated.tutorId) {
        await prisma.notification.create({
          data: {
            userId: updated.tutorId,
            title: "📝 Course Review Feedback",
            message: `Your course "${updated.title}" requires revisions before publishing. Feedback: ${reason || "Please review syllabus content."}`,
            type: "ALERT",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.tutorId });
      }
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Course returned to draft status.", course: updated });
    }

    if (action === "update_bundles") {
      const { bundles } = body;
      if (!Array.isArray(bundles) || bundles.length === 0) {
        return NextResponse.json({ error: "Invalid bundles data. Must be a non-empty array." }, { status: 400 });
      }
      const cleanBundles = bundles.map((b: any, index: number) => {
        const id = b.id ? String(b.id).trim() : `pack-${Date.now()}-${index}`;
        const name = String(b.name || `Bundle ${index + 1}`).trim();
        const hours = parseInt(b.hours, 10) || parseInt(b.tokens, 10) || 1;
        const tokens = parseInt(b.tokens, 10) || hours;
        const price = parseFloat(b.price) || 0;
        const lkrPrice = parseFloat(b.lkrPrice) || 0;
        const olPrice = b.olPrice !== undefined && b.olPrice !== null && b.olPrice !== "" && !isNaN(parseFloat(b.olPrice))
          ? parseFloat(b.olPrice)
          : undefined;
        const olLkrPrice = b.olLkrPrice !== undefined && b.olLkrPrice !== null && b.olLkrPrice !== "" && !isNaN(parseFloat(b.olLkrPrice))
          ? parseFloat(b.olLkrPrice)
          : 0;
        const popular = Boolean(b.popular);
        const badge = String(b.badge || (popular ? "Most Popular" : "Standard")).trim();
        const description = String(b.description || "").trim();
        const roleTarget = String(b.roleTarget || `${tokens} Tokens (${hours} Hours Tutoring)`).trim();
        const ctaText = String(b.ctaText || `Get ${hours} Hours Pack`).trim();
        const features = Array.isArray(b.features)
          ? b.features.map((f: any) => String(f).trim()).filter(Boolean)
          : [];

        return {
          id,
          name,
          hours,
          tokens,
          price,
          lkrPrice,
          olPrice,
          olLkrPrice,
          popular,
          badge,
          description,
          roleTarget,
          ctaText,
          features,
        };
      });

      await saveBundles(cleanBundles);
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", {});
      return NextResponse.json({
        success: true,
        message: "Token bundle packages updated successfully!",
        bundles: cleanBundles,
      });
    }

    if (
      action === "create_subject" ||
      action === "add_subject" ||
      action === "create_school" ||
      action === "add_school"
    ) {
      const { name, description, position, isActive } = body;
      try {
        const school = await createSchool({ name, description, position, isActive });
        await writeAuditLog({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          action: "create_subject",
          targetId: school.id,
          targetLabel: school.name,
          details: { name: school.name, description: school.description },
          ipAddress,
        });
        broadcastLMSEvent("COURSES_CHANGED", { action: "create_subject", subject: school });
        const allSubjects = await getSchools(false);
        return NextResponse.json({
          success: true,
          message: `Academic subject "${school.name}" created successfully.`,
          subject: school,
          school,
          subjects: allSubjects,
          schools: allSubjects,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to create academic subject" },
          { status: 400 }
        );
      }
    }

    if (action === "update_subject" || action === "update_school") {
      const { id, name, description, position, isActive } = body;
      if (!id) {
        return NextResponse.json({ error: "Subject ID is required." }, { status: 400 });
      }
      try {
        const res = await updateSchool(id, { name, description, position, isActive });
        await writeAuditLog({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          action: "update_subject",
          targetId: id,
          targetLabel: res.school.name,
          details: { name: res.school.name, coursesMigrated: res.coursesMigrated },
          ipAddress,
        });
        broadcastLMSEvent("COURSES_CHANGED", { action: "update_subject", subject: res.school });
        const allSubjects = await getSchools(false);
        return NextResponse.json({
          success: true,
          message: `Academic subject "${res.school.name}" updated successfully.${
            res.coursesMigrated > 0 ? ` (${res.coursesMigrated} assigned classes migrated)` : ""
          }`,
          ...res,
          subject: res.school,
          subjects: allSubjects,
          schools: allSubjects,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to update academic subject" },
          { status: 400 }
        );
      }
    }

    if (action === "delete_subject" || action === "delete_school") {
      const { id, reassignToCategory } = body;
      if (!id) {
        return NextResponse.json({ error: "Subject ID is required." }, { status: 400 });
      }
      try {
        const res = await deleteSchool(id, reassignToCategory);
        await writeAuditLog({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          action: "delete_subject",
          targetId: id,
          details: { reassignToCategory, affectedCourses: res.affectedCourses },
          ipAddress,
        });
        broadcastLMSEvent("COURSES_CHANGED", { action: "delete_subject", deletedId: id });
        const allSubjects = await getSchools(false);
        return NextResponse.json({
          success: true,
          message: "Academic subject removed successfully.",
          ...res,
          subjects: allSubjects,
          schools: allSubjects,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to delete academic subject" },
          { status: 400 }
        );
      }
    }

    if (action === "reorder_subjects" || action === "reorder_schools") {
      const { orderedIds } = body;
      if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ error: "orderedIds array is required." }, { status: 400 });
      }
      try {
        await reorderSchools(orderedIds);
        await writeAuditLog({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          action: "reorder_subjects",
          details: { orderedIds },
          ipAddress,
        });
        broadcastLMSEvent("COURSES_CHANGED", { action: "reorder_subjects" });
        const allSubjects = await getSchools(false);
        return NextResponse.json({
          success: true,
          message: "Subjects reordered successfully.",
          subjects: allSubjects,
          schools: allSubjects,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to reorder subjects" },
          { status: 400 }
        );
      }
    }

    if (action === "reset_subjects" || action === "reset_schools") {
      try {
        const schools = await resetDefaultSchools();
        await writeAuditLog({
          adminId: auth.user.id,
          adminEmail: auth.user.email,
          action: "reset_subjects",
          ipAddress,
        });
        broadcastLMSEvent("COURSES_CHANGED", { action: "reset_subjects" });
        return NextResponse.json({
          success: true,
          message: "Academic subjects reset to defaults.",
          subjects: schools,
          schools,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Failed to reset subjects" },
          { status: 400 }
        );
      }
    }

    if (action === "clear_all_data") {
      const adminUsers = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true, email: true, name: true },
      });

      if (adminUsers.length === 0) {
        return NextResponse.json(
          { error: "No administrator account detected. Operation aborted for safety." },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.message.deleteMany({});
        await tx.conversation.deleteMany({});

        await tx.notification.deleteMany({});

        await tx.studentAvailability.deleteMany({});
        await tx.tutorAvailability.deleteMany({});

        await tx.trialRequest.deleteMany({});

        await tx.event.deleteMany({});

        await tx.userProgress.deleteMany({});
        await tx.enrollment.deleteMany({});

        await tx.review.deleteMany({});
        await tx.certificate.deleteMany({});

        await tx.courseMaterial.deleteMany({});
        await tx.lesson.deleteMany({});
        await tx.module.deleteMany({});
        await tx.course.deleteMany({});

        await tx.privateFile.deleteMany({});
        await tx.badgeAward.deleteMany({});

        await tx.tokenTransaction.deleteMany({});

        await tx.tokenWallet.updateMany({
          where: { user: { role: Role.ADMIN } },
          data: { balance: 0 },
        });
        await tx.tokenWallet.deleteMany({
          where: { user: { role: { not: Role.ADMIN } } },
        });

        await tx.passwordResetToken.deleteMany({});
        await tx.emailVerificationToken.deleteMany({});

        await tx.user.deleteMany({
          where: { role: { not: Role.ADMIN } },
        });

        await tx.systemEvent.deleteMany({});

        await tx.auditLog.deleteMany({});
        await tx.auditLog.create({
          data: {
            adminId: auth.user.id,
            adminEmail: auth.user.email,
            action: "clear_all_data",
            category: "GENERAL",
            targetLabel: "Complete LMS Platform Data Wipe",
            details: {
              clearedAt: new Date().toISOString(),
              clearedBy: auth.user.email,
              preservedAdmins: adminUsers.map((a) => a.email),
            },
            ipAddress,
          },
        });
      }, { timeout: 30000 });

      try {
        await saveBundles(DEFAULT_BUNDLES);
      } catch (bundleErr) {
        console.warn("[clear_all_data] Failed to restore default bundles:", bundleErr);
      }

      await clearLocalStorageUploads();

      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("NOTIFICATIONS_CHANGED");
      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("CHAT_MESSAGE");

      return NextResponse.json({
        success: true,
        message: `All LMS platform data cleared successfully. Preserved ${adminUsers.length} admin account(s).`,
        preservedAdmins: adminUsers.map((a) => a.email),
      });
    }
  } catch (error) {
    console.error("Admin API POST error:", error);
    return NextResponse.json({ error: "Failed to process admin action" }, { status: 500 });
  }
}
