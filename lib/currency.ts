export const USD_TO_LKR_RATE = 300;

export function isSriLankanStudent(country?: string | null): boolean {
  return country?.trim().toLowerCase() === "sri lanka";
}

export function formatStudentPrice(
  usdPrice: number,
  country?: string | null
): string {
  if (isSriLankanStudent(country)) {
    return `LKR ${(usdPrice * USD_TO_LKR_RATE).toLocaleString("en-LK")}`;
  }

  return `USD ${usdPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}