export function isSriLankanStudent(country?: string | null): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return c === "sri lanka" || c === "lk" || c === "lka" || c === "srilanka";
}

export function getPackageCurrency(country?: string | null): "LKR" | "USD" {
  return isSriLankanStudent(country) ? "LKR" : "USD";
}

export function getStudentAcademicLevel(
  user?: { academicLevel?: string | null; headline?: string | null } | null
): "OL" | "AL" {
  if (!user) return "AL";
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
  const title = (course.title || "").toLowerCase();
  const code = (course.subjectCode || "").toLowerCase();
  const subtitle = (course.subtitle || "").toLowerCase();
  if (
    title.includes("o/l") ||
    title.includes("igcse") ||
    title.includes("ordinary level") ||
    code.includes("igcse") ||
    code.includes("ol") ||
    subtitle.includes("o/l") ||
    subtitle.includes("igcse")
  ) {
    return true;
  }
  if (
    title.includes("a/l") ||
    title.includes("ial") ||
    title.includes("advanced level") ||
    code.includes("ial") ||
    code.includes("al") ||
    subtitle.includes("a/l") ||
    subtitle.includes("ial")
  ) {
    return false;
  }
  const lvl = (course.level || "").toUpperCase();
  return lvl === "INTERMEDIATE" || lvl === "BEGINNER" || lvl.includes("O/L") || lvl.includes("IGCSE");
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