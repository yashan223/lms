export function isSriLankanStudent(country?: string | null): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return c === "sri lanka" || c === "lk" || c === "lka" || c === "srilanka";
}

export function getPackageCurrency(country?: string | null): "LKR" | "USD" {
  return isSriLankanStudent(country) ? "LKR" : "USD";
}

export function formatStudentPrice(
  usdPrice: number,
  country?: string | null,
  lkrPrice?: number
): string {
  if (isSriLankanStudent(country)) {
    const price = lkrPrice ?? 0;
    return `LKR ${price.toLocaleString("en-LK")}`;
  }

  return `USD ${usdPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}