export function isSriLankanStudent(country?: string | null): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return c === "sri lanka" || c === "lk" || c === "lka" || c === "srilanka";
}

export function getPackageCurrency(country?: string | null): "LKR" | "USD" {
  return isSriLankanStudent(country) ? "LKR" : "USD";
}

export function getStudentAcademicLevel(
  user?: { academicLevel?: string | null; headline?: string | null; role?: string | null } | null
): "OL" | "AL" | null {
  if (!user) return null;
  if (user.role && user.role !== "STUDENT") return null;
  if (user.academicLevel === "OL" || user.academicLevel === "O/L") return "OL";
  if (
    user.headline?.includes("O/L") ||
    user.headline?.includes("IGCSE") ||
    user.headline?.toUpperCase().includes("OL")
  ) {
    return "OL";
  }
  return "AL";
}

export function formatStudentPrice(
  usdPrice: number,
  country?: string | null,
  lkrPrice?: number,
  academicLevel?: "OL" | "AL" | string | null,
  olPrice?: number | null,
  olLkrPrice?: number | null
): string {
  const isOL =
    academicLevel === "OL" ||
    academicLevel?.toUpperCase().includes("O/L") ||
    academicLevel?.toUpperCase().includes("IGCSE");

  const effectiveUsd =
    isOL && olPrice !== null && olPrice !== undefined && olPrice > 0
      ? olPrice
      : usdPrice;

  const effectiveLkr =
    isOL && olLkrPrice !== null && olLkrPrice !== undefined && olLkrPrice > 0
      ? olLkrPrice
      : (lkrPrice ?? 0);

  if (isSriLankanStudent(country)) {
    return `LKR ${effectiveLkr.toLocaleString("en-LK")}`;
  }

  return `USD ${effectiveUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isCourseOL(
  course?: { level?: string | null; title?: string | null; subjectCode?: string | null; subtitle?: string | null } | null
): boolean {
  if (!course) return false;
  const lvl = (course.level || "").toUpperCase();
  if (lvl === "ADVANCED") return false;
  if (lvl === "INTERMEDIATE") return true;

  const combined = [
    course.subtitle || "",
    course.title || "",
    course.subjectCode || "",
  ].join(" ");

  const alRegex = /\b(al|a\/l|a-level|advanced\s*level|ial|ias)\b/i;
  const olRegex = /\b(ol|o\/l|o-level|ordinary\s*level|igcse|gcse)\b/i;

  if (alRegex.test(combined) && !olRegex.test(combined)) return false;
  if (olRegex.test(combined) && !alRegex.test(combined)) return true;

  return lvl === "BEGINNER" || lvl.includes("O/L") || lvl.includes("IGCSE");
}

export function isCourseAL(
  course?: { level?: string | null; title?: string | null; subjectCode?: string | null; subtitle?: string | null } | null
): boolean {
  if (!course) return true;
  return !isCourseOL(course);
}

export function getCourseAcademicLevel(
  course?: { level?: string | null; title?: string | null; subjectCode?: string | null; subtitle?: string | null } | null
): "OL" | "AL" {
  return isCourseOL(course) ? "OL" : "AL";
}