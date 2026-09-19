import { NextRequest, NextResponse } from "next/server";
import { getBundles } from "@/lib/bundles";
import { resolveGeoLocation } from "@/lib/geo";
import { getAuthenticatedUser } from "@/lib/auth";
import { getStudentAcademicLevel } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mockCountry = searchParams.get("country") || req.headers.get("x-mock-country");

    const bundles = await getBundles();
    const geo = await resolveGeoLocation(req.headers, mockCountry);
    const auth = await getAuthenticatedUser(req);

    const isLoggedIn = !!auth.user;
    const academicLevel = auth.user ? getStudentAcademicLevel(auth.user) : "AL";

    return NextResponse.json({
      success: true,
      bundles,
      country: geo.country,
      countryCode: geo.countryCode,
      isSriLanka: geo.isSriLanka,
      currency: geo.currency,
      clientIp: geo.ip,
      isLoggedIn,
      academicLevel,
    });
  } catch (error: any) {
    console.error("GET /api/bundles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token bundles" },
      { status: 500 }
    );
  }
}
