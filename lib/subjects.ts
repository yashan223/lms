import { prisma } from "./prisma";

export interface AcademicSubject {
  id: string;
  name: string;
  description?: string | null;
  position: number;
  isActive: boolean;
  classCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type AcademicSchool = AcademicSubject;

export const DEFAULT_SUBJECTS = [
  {
    name: "Mathematics & Computing",
    description: "Pure Mathematics, Mechanics, Statistics & Computer Science",
    position: 0,
    isActive: true,
  },
  {
    name: "Physics & Engineering",
    description: "Software Engineering, AI, Physics & Applied Mechanics",
    position: 1,
    isActive: true,
  },
  {
    name: "Chemistry & Biology",
    description: "Chemistry, Biology, Combined Sciences & Foundation IGCSE",
    position: 2,
    isActive: true,
  },
  {
    name: "Economics & Business Studies",
    description: "Economics, Business Studies, Accounting & Finance",
    position: 3,
    isActive: true,
  },
];

export const DEFAULT_SCHOOLS = DEFAULT_SUBJECTS;

/** Read all academic subjects. Auto-seeds defaults if the table is empty. */
export async function getSubjects(onlyActive = false): Promise<AcademicSubject[]> {
  try {
    let rows = await prisma.academicSchool.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { position: "asc" },
    });

    // Auto-seed defaults if table is empty
    if (rows.length === 0) {
      try {
        for (const def of DEFAULT_SUBJECTS) {
          await prisma.academicSchool.upsert({
            where: { name: def.name },
            update: {},
            create: {
              name: def.name,
              description: def.description,
              position: def.position,
              isActive: def.isActive,
            },
          });
        }
        rows = await prisma.academicSchool.findMany({
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: { position: "asc" },
        });
      } catch (seedErr) {
        console.warn("[subjects] Auto-seed warning:", seedErr);
      }
    }

    if (rows.length > 0) {
      // Get class counts for each subject
      const counts = await prisma.course.groupBy({
        by: ["category"],
        _count: { id: true },
      });
      const countMap = new Map<string, number>();
      for (const c of counts) {
        if (c.category) countMap.set(c.category, c._count.id);
      }

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        position: r.position,
        isActive: r.isActive,
        classCount: countMap.get(r.name) || 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    }
  } catch (err) {
    console.error("[subjects] DB query error, using defaults:", err);
  }

  // Graceful fallback to default subjects
  return DEFAULT_SUBJECTS.map((s, idx) => ({
    id: `default-${idx}`,
    name: s.name,
    description: s.description,
    position: s.position,
    isActive: s.isActive,
    classCount: 0,
  }));
}

/** Get list of subject names for category dropdowns and filter bars. */
export async function getSubjectNames(onlyActive = true): Promise<string[]> {
  const subjects = await getSubjects(onlyActive);
  return subjects.map((s) => s.name);
}

/** Add a new academic subject. */
export async function createSubject(data: {
  name: string;
  description?: string;
  position?: number;
  isActive?: boolean;
}): Promise<AcademicSubject> {
  const trimmedName = (data.name || "").trim();
  if (!trimmedName) {
    throw new Error("Subject name is required.");
  }

  const existing = await prisma.academicSchool.findUnique({
    where: { name: trimmedName },
  });
  if (existing) {
    throw new Error(`A subject named "${trimmedName}" already exists.`);
  }

  const currentCount = await prisma.academicSchool.count();
  const position = typeof data.position === "number" ? data.position : currentCount;

  const school = await prisma.academicSchool.create({
    data: {
      name: trimmedName,
      description: data.description?.trim() || null,
      position,
      isActive: data.isActive ?? true,
    },
  });

  return {
    id: school.id,
    name: school.name,
    description: school.description,
    position: school.position,
    isActive: school.isActive,
    classCount: 0,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
  };
}

/** Update an existing academic subject. Automatically renames existing course categories if renamed. */
export async function updateSubject(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    position?: number;
    isActive?: boolean;
  }
): Promise<{ subject: AcademicSubject; school: AcademicSubject; coursesMigrated: number }> {
  const current = await prisma.academicSchool.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Subject not found.");
  }

  const newName = data.name !== undefined ? data.name.trim() : current.name;
  if (!newName) {
    throw new Error("Subject name cannot be empty.");
  }

  // If renaming, check for collisions
  if (newName !== current.name) {
    const existing = await prisma.academicSchool.findUnique({ where: { name: newName } });
    if (existing && existing.id !== id) {
      throw new Error(`Another subject named "${newName}" already exists.`);
    }
  }

  let coursesMigrated = 0;
  if (newName !== current.name) {
    // Migrate any classes under old category to new category
    const updateResult = await prisma.course.updateMany({
      where: { category: current.name },
      data: { category: newName },
    });
    coursesMigrated = updateResult.count;
  }

  const updated = await prisma.academicSchool.update({
    where: { id },
    data: {
      name: newName,
      description: data.description !== undefined ? data.description?.trim() || null : current.description,
      position: typeof data.position === "number" ? data.position : current.position,
      isActive: data.isActive !== undefined ? data.isActive : current.isActive,
    },
  });

  const classCount = await prisma.course.count({ where: { category: updated.name } });

  const subjectObj: AcademicSubject = {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    position: updated.position,
    isActive: updated.isActive,
    classCount,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };

  return {
    subject: subjectObj,
    school: subjectObj,
    coursesMigrated,
  };
}

/** Delete an academic subject. */
export async function deleteSubject(
  id: string,
  reassignToCategory?: string
): Promise<{ deletedId: string; affectedCourses: number }> {
  const current = await prisma.academicSchool.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Subject not found.");
  }

  const classCount = await prisma.course.count({ where: { category: current.name } });

  if (classCount > 0 && !reassignToCategory) {
    throw new Error(
      `Cannot delete "${current.name}" because ${classCount} class${
        classCount === 1 ? " is" : "es are"
      } currently assigned to it. Please reassign those classes or specify a target subject first.`
    );
  }

  let affectedCourses = 0;
  if (classCount > 0 && reassignToCategory) {
    const reassignRes = await prisma.course.updateMany({
      where: { category: current.name },
      data: { category: reassignToCategory },
    });
    affectedCourses = reassignRes.count;
  }

  await prisma.academicSchool.delete({ where: { id } });

  return { deletedId: id, affectedCourses };
}

/** Reorder subjects according to provided ID list. */
export async function reorderSubjects(orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.academicSchool.update({
        where: { id },
        data: { position: index },
      })
    )
  );
}

/** Reset subjects to default 4 subjects. */
export async function resetDefaultSubjects(): Promise<AcademicSubject[]> {
  for (const def of DEFAULT_SUBJECTS) {
    await prisma.academicSchool.upsert({
      where: { name: def.name },
      update: {
        description: def.description,
        position: def.position,
        isActive: def.isActive,
      },
      create: {
        name: def.name,
        description: def.description,
        position: def.position,
        isActive: def.isActive,
      },
    });
  }
  return getSubjects(false);
}

// ── Backward-Compatible Aliases ──────────────────────────────────────────────
export const getSchools = getSubjects;
export const getSchoolNames = getSubjectNames;
export const createSchool = createSubject;
export const updateSchool = updateSubject;
export const deleteSchool = deleteSubject;
export const reorderSchools = reorderSubjects;
export const resetDefaultSchools = resetDefaultSubjects;
