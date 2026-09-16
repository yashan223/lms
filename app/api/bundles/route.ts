import { NextRequest, NextResponse } from "next/server";
import { getBundles } from "@/lib/bundles";
import { resolveGeoLocation } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mockCountry = searchParams.get("country") || req.headers.get("x-mock-country");

    const bundles = await getBundles();
    const geo = await resolveGeoLocation(req.headers, mockCountry);

    return NextResponse.json({
      success: true,
      bundles,
      country: geo.country,
      countryCode: geo.countryCode,
      isSriLanka: geo.isSriLanka,
      currency: geo.currency,
      clientIp: geo.ip,
    });
  } catch (error: any) {
    console.error("GET /api/bundles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token bundles" },
      { status: 500 }
    );
  }
}
