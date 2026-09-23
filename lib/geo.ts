/**
 * IP and Country Geolocation Utilities for EduPulse LMS
 */

export interface GeoLocationResult {
  ip: string;
  country: string; // e.g. "Sri Lanka", "United States", etc.
  countryCode: string; // e.g. "LK", "US", etc.
  isSriLanka: boolean;
  currency: "LKR" | "USD";
}

// In-memory cache for resolved IPs (1 hour TTL)
const ipCache = new Map<string, { country: string; countryCode: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let serverExternalCountryCache: { country: string; countryCode: string; timestamp: number } | null = null;

export function isSriLankaCountry(countryOrCode?: string | null): boolean {
  if (!countryOrCode) return false;
  const c = countryOrCode.trim().toLowerCase();
  return c === "sri lanka" || c === "lk" || c === "lka" || c === "srilanka";
}

export function extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as any).get === "function") {
      return (headers as Headers).get(name);
    }
    const val = (headers as any)[name] || (headers as any)[name.toLowerCase()];
    if (Array.isArray(val)) return val[0] || null;
    return val || null;
  };

  const forwarded = getHeader("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const cfIp = getHeader("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = getHeader("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

export function extractCountryFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): string | null {
  const getHeader = (name: string): string | null => {
    if (typeof (headers as any).get === "function") {
      return (headers as Headers).get(name);
    }
    const val = (headers as any)[name] || (headers as any)[name.toLowerCase()];
    if (Array.isArray(val)) return val[0] || null;
    return val || null;
  };

  // Direct country headers provided by CDNs & reverse proxies
  const headerKeys = [
    "cf-ipcountry",
    "x-country-code",
    "cloudfront-viewer-country",
    "x-geo-country",
    "x-mock-country",
  ];

  for (const key of headerKeys) {
    const val = getHeader(key);
    if (val && val.trim()) {
      return val.trim();
    }
  }

  return null;
}

export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (clean === "127.0.0.1" || clean === "::1" || clean === "localhost") return true;
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  return false;
}

export async function lookupIpCountry(ip: string): Promise<{ country: string; countryCode: string } | null> {
  const cleanIp = ip.replace(/^::ffff:/, "").trim();
  const cached = ipCache.get(cleanIp);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { country: cached.country, countryCode: cached.countryCode };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=country,countryCode,status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.countryCode) {
        const result = {
          country: data.country || (data.countryCode === "LK" ? "Sri Lanka" : data.countryCode),
          countryCode: data.countryCode.toUpperCase(),
        };
        ipCache.set(cleanIp, { ...result, timestamp: Date.now() });
        return result;
      }
    }
  } catch {
    // Fallback to api.country.is
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(`https://api.country.is/${encodeURIComponent(cleanIp)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          const code = data.country.toUpperCase();
          const result = {
            country: code === "LK" ? "Sri Lanka" : code,
            countryCode: code,
          };
          ipCache.set(cleanIp, { ...result, timestamp: Date.now() });
          return result;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * For local development or when the incoming IP is private/loopback,
 * this fetches the public IP of the current internet connection.
 */
export async function getLocalOrServerFallbackCountry(): Promise<{ country: string; countryCode: string }> {
  if (serverExternalCountryCache && Date.now() - serverExternalCountryCache.timestamp < CACHE_TTL_MS) {
    return serverExternalCountryCache;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const res = await fetch("http://ip-api.com/json/?fields=country,countryCode,status", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.countryCode) {
        serverExternalCountryCache = {
          country: data.country || (data.countryCode === "LK" ? "Sri Lanka" : data.countryCode),
          countryCode: data.countryCode.toUpperCase(),
          timestamp: Date.now(),
        };
        return serverExternalCountryCache;
      }
    }
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);

      const res = await fetch("https://api.country.is/", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          const code = data.country.toUpperCase();
          serverExternalCountryCache = {
            country: code === "LK" ? "Sri Lanka" : code,
            countryCode: code,
            timestamp: Date.now(),
          };
          return serverExternalCountryCache;
        }
      }
    } catch {}
  }

  return { country: "United States", countryCode: "US" };
}

/**
 * Resolves user geolocation based on request headers and IP.
 * Supports manual override via mockCountry parameter (e.g. for testing / debugging).
 */
export async function resolveGeoLocation(
  headers: Headers | Record<string, string | string[] | undefined>,
  mockCountryOverride?: string | null
): Promise<GeoLocationResult> {
  if (mockCountryOverride) {
    const isLK = isSriLankaCountry(mockCountryOverride);
    return {
      ip: "override",
      country: isLK ? "Sri Lanka" : mockCountryOverride,
      countryCode: isLK ? "LK" : mockCountryOverride.toUpperCase(),
      isSriLanka: isLK,
      currency: isLK ? "LKR" : "USD",
    };
  }

  const clientIp = extractClientIp(headers);
  const headerCountry = extractCountryFromHeaders(headers);

  let countryCode = headerCountry;
  let countryName = headerCountry;

  if (headerCountry) {
    const isLK = isSriLankaCountry(headerCountry);
    return {
      ip: clientIp,
      country: isLK ? "Sri Lanka" : headerCountry,
      countryCode: isLK ? "LK" : headerCountry.toUpperCase(),
      isSriLanka: isLK,
      currency: isLK ? "LKR" : "USD",
    };
  }

  if (!isPrivateOrLocalIp(clientIp)) {
    const lookup = await lookupIpCountry(clientIp);
    if (lookup) {
      countryCode = lookup.countryCode;
      countryName = lookup.country;
    }
  } else {
    const fallback = await getLocalOrServerFallbackCountry();
    countryCode = fallback.countryCode;
    countryName = fallback.country;
  }

  const code = (countryCode || "US").toUpperCase();
  const isSriLanka = isSriLankaCountry(code) || isSriLankaCountry(countryName);

  return {
    ip: clientIp,
    country: isSriLanka ? "Sri Lanka" : (countryName || code),
    countryCode: code,
    isSriLanka,
    currency: isSriLanka ? "LKR" : "USD",
  };
}
