
export interface RegionalTimezone {
  id: string;
  region: string;
  city: string;
  countryCode: string;
  flag: string;
  standardOffset: string;
  abbr: string;
  label: string;
}

export const DEFAULT_TIMEZONE = "Asia/Colombo";
export const DEFAULT_REGION = "Sri Lanka";

export function countryCodeToFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

let regionNamesEn: Intl.DisplayNames | null = null;
try {
  if (typeof Intl !== "undefined" && (Intl as any).DisplayNames) {
    regionNamesEn = new Intl.DisplayNames(["en"], { type: "region" });
  }
} catch {}

export function getCountryName(countryCode: string): string {
  try {
    return regionNamesEn?.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

export const TZ_TO_COUNTRY: Record<string, string> = {
  "Africa/Abidjan": "CI",
  "Africa/Accra": "GH",
  "Africa/Addis_Ababa": "ET",
  "Africa/Algiers": "DZ",
  "Africa/Asmara": "ER",
  "Africa/Asmera": "ER",
  "Africa/Bamako": "ML",
  "Africa/Bangui": "CF",
  "Africa/Banjul": "GM",
  "Africa/Bissau": "GW",
  "Africa/Blantyre": "MW",
  "Africa/Brazzaville": "CG",
  "Africa/Bujumbura": "BI",
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Africa/Ceuta": "ES",
  "Africa/Conakry": "GN",
  "Africa/Dakar": "SN",
  "Africa/Dar_es_Salaam": "TZ",
  "Africa/Djibouti": "DJ",
  "Africa/Douala": "CM",
  "Africa/El_Aaiun": "EH",
  "Africa/Freetown": "SL",
  "Africa/Gaborone": "BW",
  "Africa/Harare": "ZW",
  "Africa/Johannesburg": "ZA",
  "Africa/Juba": "SS",
  "Africa/Kampala": "UG",
  "Africa/Khartoum": "SD",
  "Africa/Kigali": "RW",
  "Africa/Kinshasa": "CD",
  "Africa/Lagos": "NG",
  "Africa/Libreville": "GA",
  "Africa/Lome": "TG",
  "Africa/Luanda": "AO",
  "Africa/Lubumbashi": "CD",
  "Africa/Lusaka": "ZM",
  "Africa/Malabo": "GQ",
  "Africa/Maputo": "MZ",
  "Africa/Maseru": "LS",
  "Africa/Mbabane": "SZ",
  "Africa/Mogadishu": "SO",
  "Africa/Monrovia": "LR",
  "Africa/Nairobi": "KE",
  "Africa/Ndjamena": "TD",
  "Africa/Niamey": "NE",
  "Africa/Nouakchott": "MR",
  "Africa/Ouagadougou": "BF",
  "Africa/Porto-Novo": "BJ",
  "Africa/Sao_Tome": "ST",
  "Africa/Tripoli": "LY",
  "Africa/Tunis": "TN",
  "Africa/Windhoek": "NA",

  "America/Adak": "US",
  "America/Anchorage": "US",
  "America/Anguilla": "AI",
  "America/Antigua": "AG",
  "America/Araguaina": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Argentina/Catamarca": "AR",
  "America/Argentina/Cordoba": "AR",
  "America/Argentina/Jujuy": "AR",
  "America/Argentina/La_Rioja": "AR",
  "America/Argentina/Mendoza": "AR",
  "America/Argentina/Rio_Gallegos": "AR",
  "America/Argentina/Salta": "AR",
  "America/Argentina/San_Juan": "AR",
  "America/Argentina/San_Luis": "AR",
  "America/Argentina/Tucuman": "AR",
  "America/Argentina/Ushuaia": "AR",
  "America/Aruba": "AW",
  "America/Asuncion": "PY",
  "America/Atikokan": "CA",
  "America/Bahia": "BR",
  "America/Bahia_Banderas": "MX",
  "America/Barbados": "BB",
  "America/Belem": "BR",
  "America/Belize": "BZ",
  "America/Blanc-Sablon": "CA",
  "America/Boa_Vista": "BR",
  "America/Bogota": "CO",
  "America/Boise": "US",
  "America/Buenos_Aires": "AR",
  "America/Cambridge_Bay": "CA",
  "America/Campo_Grande": "BR",
  "America/Cancun": "MX",
  "America/Caracas": "VE",
  "America/Catamarca": "AR",
  "America/Cayenne": "GF",
  "America/Cayman": "KY",
  "America/Chicago": "US",
  "America/Chihuahua": "MX",
  "America/Ciudad_Juarez": "MX",
  "America/Coral_Harbour": "CA",
  "America/Cordoba": "AR",
  "America/Costa_Rica": "CR",
  "America/Creston": "CA",
  "America/Cuiaba": "BR",
  "America/Curacao": "CW",
  "America/Coyhaique": "CL",
  "America/Danmarkshavn": "GL",
  "America/Godthab": "GL",
  "America/Dawson": "CA",
  "America/Dawson_Creek": "CA",
  "America/Denver": "US",
  "America/Detroit": "US",
  "America/Dominica": "DM",
  "America/Edmonton": "CA",
  "America/Eirunepe": "BR",
  "America/El_Salvador": "SV",
  "America/Fort_Nelson": "CA",
  "America/Fortaleza": "BR",
  "America/Glace_Bay": "CA",
  "America/Goose_Bay": "CA",
  "America/Grand_Turk": "TC",
  "America/Grenada": "GD",
  "America/Guadeloupe": "GP",
  "America/Guatemala": "GT",
  "America/Guayaquil": "EC",
  "America/Guyana": "GY",
  "America/Halifax": "CA",
  "America/Havana": "CU",
  "America/Hermosillo": "MX",
  "America/Indiana/Indianapolis": "US",
  "America/Indiana/Knox": "US",
  "America/Indiana/Marengo": "US",
  "America/Indiana/Petersburg": "US",
  "America/Indiana/Tell_City": "US",
  "America/Indiana/Vevay": "US",
  "America/Indiana/Vincennes": "US",
  "America/Indiana/Winamac": "US",
  "America/Indianapolis": "US",
  "America/Inuvik": "CA",
  "America/Iqaluit": "CA",
  "America/Jamaica": "JM",
  "America/Jujuy": "AR",
  "America/Juneau": "US",
  "America/Kentucky/Louisville": "US",
  "America/Kentucky/Monticello": "US",
  "America/Kralendijk": "BQ",
  "America/La_Paz": "BO",
  "America/Lima": "PE",
  "America/Los_Angeles": "US",
  "America/Louisville": "US",
  "America/Lower_Princes": "SX",
  "America/Maceio": "BR",
  "America/Managua": "NI",
  "America/Manaus": "BR",
  "America/Marigot": "MF",
  "America/Martinique": "MQ",
  "America/Matamoros": "MX",
  "America/Mazatlan": "MX",
  "America/Mendoza": "AR",
  "America/Menominee": "US",
  "America/Merida": "MX",
  "America/Metlakatla": "US",
  "America/Mexico_City": "MX",
  "America/Miquelon": "PM",
  "America/Moncton": "CA",
  "America/Monterrey": "MX",
  "America/Montevideo": "UY",
  "America/Montserrat": "MS",
  "America/Nassau": "BS",
  "America/New_York": "US",
  "America/Nipigon": "CA",
  "America/Nome": "US",
  "America/Noronha": "BR",
  "America/North_Dakota/Beulah": "US",
  "America/North_Dakota/Center": "US",
  "America/North_Dakota/New_Salem": "US",
  "America/Nuuk": "GL",
  "America/Ojinaga": "MX",
  "America/Panama": "PA",
  "America/Pangnirtung": "CA",
  "America/Paramaribo": "SR",
  "America/Phoenix": "US",
  "America/Port-au-Prince": "HT",
  "America/Port_of_Spain": "TT",
  "America/Porto_Velho": "BR",
  "America/Puerto_Rico": "PR",
  "America/Punta_Arenas": "CL",
  "America/Rainy_River": "CA",
  "America/Rankin_Inlet": "CA",
  "America/Recife": "BR",
  "America/Regina": "CA",
  "America/Resolute": "CA",
  "America/Rio_Branco": "BR",
  "America/Rosario": "AR",
  "America/Santarem": "BR",
  "America/Santiago": "CL",
  "America/Santo_Domingo": "DO",
  "America/Sao_Paulo": "BR",
  "America/Scoresbysund": "GL",
  "America/Sitka": "US",
  "America/St_Barthelemy": "BL",
  "America/St_Johns": "CA",
  "America/St_Kitts": "KN",
  "America/St_Lucia": "LC",
  "America/St_Thomas": "VI",
  "America/St_Vincent": "VC",
  "America/Swift_Current": "CA",
  "America/Tegucigalpa": "HN",
  "America/Thule": "GL",
  "America/Thunder_Bay": "CA",
  "America/Tijuana": "MX",
  "America/Toronto": "CA",
  "America/Tortola": "VG",
  "America/Vancouver": "CA",
  "America/Whitehorse": "CA",
  "America/Winnipeg": "CA",
  "America/Yakutat": "US",
  "America/Yellowknife": "CA",

  "Antarctica/Casey": "AQ",
  "Antarctica/Davis": "AQ",
  "Antarctica/DumontDUrville": "AQ",
  "Antarctica/Macquarie": "AU",
  "Antarctica/Mawson": "AQ",
  "Antarctica/McMurdo": "AQ",
  "Antarctica/Palmer": "AQ",
  "Antarctica/Rothera": "AQ",
  "Antarctica/South_Pole": "AQ",
  "Antarctica/Syowa": "AQ",
  "Antarctica/Troll": "AQ",
  "Antarctica/Vostok": "AQ",

  "Arctic/Longyearbyen": "SJ",

  "Asia/Aden": "YE",
  "Asia/Almaty": "KZ",
  "Asia/Amman": "JO",
  "Asia/Anadyr": "RU",
  "Asia/Aqtau": "KZ",
  "Asia/Aqtobe": "KZ",
  "Asia/Ashgabat": "TM",
  "Asia/Atyrau": "KZ",
  "Asia/Baghdad": "IQ",
  "Asia/Bahrain": "BH",
  "Asia/Baku": "AZ",
  "Asia/Bangkok": "TH",
  "Asia/Barnaul": "RU",
  "Asia/Beirut": "LB",
  "Asia/Bishkek": "KG",
  "Asia/Brunei": "BN",
  "Asia/Calcutta": "IN",
  "Asia/Chita": "RU",
  "Asia/Choibalsan": "MN",
  "Asia/Colombo": "LK",
  "Asia/Damascus": "SY",
  "Asia/Dhaka": "BD",
  "Asia/Dili": "TL",
  "Asia/Dubai": "AE",
  "Asia/Dushanbe": "TJ",
  "Asia/Famagusta": "CY",
  "Asia/Gaza": "PS",
  "Asia/Hebron": "PS",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Hovd": "MN",
  "Asia/Irkutsk": "RU",
  "Asia/Jakarta": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Jerusalem": "IL",
  "Asia/Kabul": "AF",
  "Asia/Kamchatka": "RU",
  "Asia/Karachi": "PK",
  "Asia/Kashgar": "CN",
  "Asia/Kathmandu": "NP",
  "Asia/Katmandu": "NP",
  "Asia/Khandyga": "RU",
  "Asia/Kolkata": "IN",
  "Asia/Krasnoyarsk": "RU",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuching": "MY",
  "Asia/Kuwait": "KW",
  "Asia/Macau": "MO",
  "Asia/Magadan": "RU",
  "Asia/Makassar": "ID",
  "Asia/Manila": "PH",
  "Asia/Muscat": "OM",
  "Asia/Nicosia": "CY",
  "Asia/Novokuznetsk": "RU",
  "Asia/Novosibirsk": "RU",
  "Asia/Omsk": "RU",
  "Asia/Oral": "KZ",
  "Asia/Phnom_Penh": "KH",
  "Asia/Pontianak": "ID",
  "Asia/Pyongyang": "KP",
  "Asia/Qatar": "QA",
  "Asia/Qostanay": "KZ",
  "Asia/Qyzylorda": "KZ",
  "Asia/Rangoon": "MM",
  "Asia/Riyadh": "SA",
  "Asia/Saigon": "VN",
  "Asia/Sakhalin": "RU",
  "Asia/Samarkand": "UZ",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG",
  "Asia/Srednekolymsk": "RU",
  "Asia/Taipei": "TW",
  "Asia/Tashkent": "UZ",
  "Asia/Tbilisi": "GE",
  "Asia/Tehran": "IR",
  "Asia/Thimphu": "BT",
  "Asia/Tokyo": "JP",
  "Asia/Tomsk": "RU",
  "Asia/Ujung_Pandang": "ID",
  "Asia/Ulaanbaatar": "MN",
  "Asia/Urumqi": "CN",
  "Asia/Ust-Nera": "RU",
  "Asia/Vientiane": "LA",
  "Asia/Vladivostok": "RU",
  "Asia/Yakutsk": "RU",
  "Asia/Yangon": "MM",
  "Asia/Yekaterinburg": "RU",
  "Asia/Yerevan": "AM",

  "Atlantic/Azores": "PT",
  "Atlantic/Bermuda": "BM",
  "Atlantic/Canary": "ES",
  "Atlantic/Cape_Verde": "CV",
  "Atlantic/Faeroe": "FO",
  "Atlantic/Faroe": "FO",
  "Atlantic/Madeira": "PT",
  "Atlantic/Reykjavik": "IS",
  "Atlantic/South_Georgia": "GS",
  "Atlantic/St_Helena": "SH",
  "Atlantic/Stanley": "FK",

  "Australia/ACT": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Broken_Hill": "AU",
  "Australia/Canberra": "AU",
  "Australia/Currie": "AU",
  "Australia/Darwin": "AU",
  "Australia/Eucla": "AU",
  "Australia/Hobart": "AU",
  "Australia/LHI": "AU",
  "Australia/Lindeman": "AU",
  "Australia/Lord_Howe": "AU",
  "Australia/Melbourne": "AU",
  "Australia/NSW": "AU",
  "Australia/North": "AU",
  "Australia/Perth": "AU",
  "Australia/Queensland": "AU",
  "Australia/South": "AU",
  "Australia/Sydney": "AU",
  "Australia/Tasmania": "AU",
  "Australia/Victoria": "AU",
  "Australia/West": "AU",
  "Australia/Yancowinna": "AU",

  "Europe/Amsterdam": "NL",
  "Europe/Andorra": "AD",
  "Europe/Astrakhan": "RU",
  "Europe/Athens": "GR",
  "Europe/Belfast": "GB",
  "Europe/Belgrade": "RS",
  "Europe/Berlin": "DE",
  "Europe/Bratislava": "SK",
  "Europe/Brussels": "BE",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Busingen": "DE",
  "Europe/Chisinau": "MD",
  "Europe/Copenhagen": "DK",
  "Europe/Dublin": "IE",
  "Europe/Gibraltar": "GI",
  "Europe/Guernsey": "GG",
  "Europe/Helsinki": "FI",
  "Europe/Isle_of_Man": "IM",
  "Europe/Istanbul": "TR",
  "Europe/Jersey": "JE",
  "Europe/Kaliningrad": "RU",
  "Europe/Kiev": "UA",
  "Europe/Kirov": "RU",
  "Europe/Kyiv": "UA",
  "Europe/Lisbon": "PT",
  "Europe/Ljubljana": "SI",
  "Europe/London": "GB",
  "Europe/Luxembourg": "LU",
  "Europe/Madrid": "ES",
  "Europe/Malta": "MT",
  "Europe/Mariehamn": "AX",
  "Europe/Minsk": "BY",
  "Europe/Monaco": "MC",
  "Europe/Moscow": "RU",
  "Europe/Nicosia": "CY",
  "Europe/Oslo": "NO",
  "Europe/Paris": "FR",
  "Europe/Podgorica": "ME",
  "Europe/Prague": "CZ",
  "Europe/Riga": "LV",
  "Europe/Rome": "IT",
  "Europe/Samara": "RU",
  "Europe/San_Marino": "SM",
  "Europe/Sarajevo": "BA",
  "Europe/Saratov": "RU",
  "Europe/Simferopol": "UA",
  "Europe/Skopje": "MK",
  "Europe/Sofia": "BG",
  "Europe/Stockholm": "SE",
  "Europe/Tallinn": "EE",
  "Europe/Tirane": "AL",
  "Europe/Ulyanovsk": "RU",
  "Europe/Uzhgorod": "UA",
  "Europe/Vaduz": "LI",
  "Europe/Vatican": "VA",
  "Europe/Vienna": "AT",
  "Europe/Vilnius": "LT",
  "Europe/Volgograd": "RU",
  "Europe/Warsaw": "PL",
  "Europe/Zagreb": "HR",
  "Europe/Zaporozhye": "UA",
  "Europe/Zurich": "CH",

  "Indian/Antananarivo": "MG",
  "Indian/Chagos": "IO",
  "Indian/Christmas": "CX",
  "Indian/Cocos": "CC",
  "Indian/Comoro": "KM",
  "Indian/Kerguelen": "TF",
  "Indian/Mahe": "SC",
  "Indian/Maldives": "MV",
  "Indian/Mauritius": "MU",
  "Indian/Mayotte": "YT",
  "Indian/Reunion": "RE",

  "Pacific/Apia": "WS",
  "Pacific/Auckland": "NZ",
  "Pacific/Bougainville": "PG",
  "Pacific/Chatham": "NZ",
  "Pacific/Chuuk": "FM",
  "Pacific/Easter": "CL",
  "Pacific/Efate": "VU",
  "Pacific/Enderbury": "KI",
  "Pacific/Fakaofo": "TK",
  "Pacific/Fiji": "FJ",
  "Pacific/Funafuti": "TV",
  "Pacific/Galapagos": "EC",
  "Pacific/Gambier": "PF",
  "Pacific/Guadalcanal": "SB",
  "Pacific/Guam": "GU",
  "Pacific/Honolulu": "US",
  "Pacific/Johnston": "UM",
  "Pacific/Kanton": "KI",
  "Pacific/Kiritimati": "KI",
  "Pacific/Kosrae": "FM",
  "Pacific/Kwajalein": "MH",
  "Pacific/Majuro": "MH",
  "Pacific/Marquesas": "PF",
  "Pacific/Midway": "UM",
  "Pacific/Nauru": "NR",
  "Pacific/Niue": "NU",
  "Pacific/Norfolk": "NF",
  "Pacific/Noumea": "NC",
  "Pacific/Pago_Pago": "AS",
  "Pacific/Palau": "PW",
  "Pacific/Pitcairn": "PN",
  "Pacific/Pohnpei": "FM",
  "Pacific/Ponape": "FM",
  "Pacific/Port_Moresby": "PG",
  "Pacific/Rarotonga": "CK",
  "Pacific/Saipan": "MP",
  "Pacific/Tahiti": "PF",
  "Pacific/Tarawa": "KI",
  "Pacific/Tongatapu": "TO",
  "Pacific/Truk": "FM",
  "Pacific/Wake": "UM",
  "Pacific/Wallis": "WF",
};

export const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  LK: "Asia/Colombo",
  GB: "Europe/London",
  UK: "Europe/London",
  US: "America/New_York",
  CA: "America/Toronto",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  QA: "Asia/Qatar",
  SG: "Asia/Singapore",
  MY: "Asia/Kuala_Lumpur",
  IN: "Asia/Kolkata",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  PK: "Asia/Karachi",
  BD: "Asia/Dhaka",
  MV: "Indian/Maldives",
  KW: "Asia/Kuwait",
  OM: "Asia/Muscat",
  BH: "Asia/Bahrain",
  DE: "Europe/Berlin",
  FR: "Europe/Paris",
  IT: "Europe/Rome",
  ES: "Europe/Madrid",
  ZA: "Africa/Johannesburg",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  CN: "Asia/Shanghai",
  HK: "Asia/Hong_Kong",
  TW: "Asia/Taipei",
  TH: "Asia/Bangkok",
  ID: "Asia/Jakarta",
  PH: "Asia/Manila",
  VN: "Asia/Ho_Chi_Minh",
  NP: "Asia/Kathmandu",
  EG: "Africa/Cairo",
  NG: "Africa/Lagos",
  KE: "Africa/Nairobi",
  BR: "America/Sao_Paulo",
  MX: "America/Mexico_City",
  AR: "America/Buenos_Aires",
  CL: "America/Santiago",
  CO: "America/Bogota",
  PE: "America/Lima",
  NL: "Europe/Amsterdam",
  CH: "Europe/Zurich",
  IE: "Europe/Dublin",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  PL: "Europe/Warsaw",
  AT: "Europe/Vienna",
  BE: "Europe/Brussels",
  PT: "Europe/Lisbon",
  GR: "Europe/Athens",
  TR: "Europe/Istanbul",
  UA: "Europe/Kyiv",
  RU: "Europe/Moscow",
};

export const POPULAR_TIMEZONE_IDS: string[] = [
  "Asia/Colombo",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Australia/Perth",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Pacific/Auckland",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Indian/Maldives",
  "Asia/Kuwait",
  "Asia/Muscat",
  "Africa/Johannesburg",
];

function buildAllWorldTimezones(): RegionalTimezone[] {
  const result: RegionalTimezone[] = [];
  const addedIds = new Set<string>();

  const allSupported =
    typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function"
      ? (Intl as any).supportedValuesOf("timeZone")
      : Object.keys(TZ_TO_COUNTRY);

  const prioritizedList = [
    ...POPULAR_TIMEZONE_IDS,
    ...allSupported.filter((tz: string) => !POPULAR_TIMEZONE_IDS.includes(tz)),
  ];

  for (const tz of prioritizedList) {
    if (addedIds.has(tz)) continue;
    addedIds.add(tz);

    const countryCode = TZ_TO_COUNTRY[tz] || "GL";
    const flag = countryCodeToFlag(countryCode);
    const countryName = getCountryName(countryCode) || tz.split("/")[0] || "Global";
    const rawCity = tz.split("/").pop()?.replace(/_/g, " ") || tz;

    let offsetStr = "UTC+00:00";
    try {
      offsetStr = getTimezoneOffsetString(new Date(), tz);
    } catch {}

    result.push({
      id: tz,
      region: countryName,
      city: rawCity,
      countryCode,
      flag,
      standardOffset: offsetStr,
      abbr: flag,
      label: `${flag} ${countryName} (${rawCity}) • ${offsetStr}`,
    });
  }

  return result;
}

export const REGIONAL_TIMEZONES: RegionalTimezone[] = buildAllWorldTimezones();

export function getUserBrowserTimezone(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TIMEZONE;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {}
  return DEFAULT_TIMEZONE;
}

export function getTimezoneFlag(timezone?: string | null): string {
  if (!timezone) return "🇱🇰";
  const directCountry = TZ_TO_COUNTRY[timezone];
  if (directCountry) return countryCodeToFlag(directCountry);
  const mapped = COUNTRY_TO_TIMEZONE[timezone.toUpperCase()];
  if (mapped && TZ_TO_COUNTRY[mapped]) return countryCodeToFlag(TZ_TO_COUNTRY[mapped]);
  const regional = REGIONAL_TIMEZONES.find((r) => r.id.toLowerCase() === timezone.toLowerCase());
  if (regional?.flag) return regional.flag;
  return "🌐";
}

export function getTimezoneCountryCode(timezone?: string | null): string {
  if (!timezone) return "LK";
  const directCountry = TZ_TO_COUNTRY[timezone];
  if (directCountry) return directCountry.toUpperCase();
  const mapped = COUNTRY_TO_TIMEZONE[timezone.toUpperCase()];
  if (mapped && TZ_TO_COUNTRY[mapped]) return TZ_TO_COUNTRY[mapped].toUpperCase();
  const regional = REGIONAL_TIMEZONES.find((r) => r.id.toLowerCase() === timezone.toLowerCase());
  if (regional?.countryCode) return regional.countryCode.toUpperCase();
  return "LK";
}

export function getRegionalTimezone(tzOrCountry?: string | null): RegionalTimezone {
  if (!tzOrCountry) {
    return REGIONAL_TIMEZONES[0];
  }

  const clean = tzOrCountry.trim();

  const directMatch = REGIONAL_TIMEZONES.find(
    (r) => r.id.toLowerCase() === clean.toLowerCase()
  );
  if (directMatch) return directMatch;

  const countryCode = clean.toUpperCase();
  const byCode = REGIONAL_TIMEZONES.find((r) => r.countryCode === countryCode);
  if (byCode) return byCode;

  const mappedTz = COUNTRY_TO_TIMEZONE[countryCode];
  if (mappedTz) {
    const mappedObj = REGIONAL_TIMEZONES.find((r) => r.id === mappedTz);
    if (mappedObj) return mappedObj;
  }

  const byRegion = REGIONAL_TIMEZONES.find(
    (r) => r.region.toLowerCase().includes(clean.toLowerCase())
  );
  if (byRegion) return byRegion;

  try {
    const d = new Date();
    const resolvedCountryCode = TZ_TO_COUNTRY[clean] || "GL";
    const flag = countryCodeToFlag(resolvedCountryCode);
    const countryName = getCountryName(resolvedCountryCode) || clean.split("/")[0] || clean;
    const offsetStr = getTimezoneOffsetString(d, clean);
    const rawCity = clean.split("/").pop()?.replace(/_/g, " ") || clean;

    return {
      id: clean,
      region: countryName,
      city: rawCity,
      countryCode: resolvedCountryCode,
      flag,
      standardOffset: offsetStr,
      abbr: flag,
      label: `${flag} ${countryName} (${rawCity}) • ${offsetStr}`,
    };
  } catch {}

  return REGIONAL_TIMEZONES[0];
}

export function getTimezoneOffsetString(date: Date = new Date(), timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value;
    if (offsetPart && offsetPart.startsWith("GMT")) {
      return offsetPart.replace("GMT", "UTC");
    }
    if (offsetPart) return offsetPart;
  } catch {}

  try {
    const dStr = date.toLocaleString("en-US", { timeZone: timezone });
    const localD = new Date(dStr);
    const diffMin = Math.round((localD.getTime() - date.getTime()) / 60000);
    const sign = diffMin >= 0 ? "+" : "-";
    const absMin = Math.abs(diffMin);
    const h = String(Math.floor(absMin / 60)).padStart(2, "0");
    const m = String(absMin % 60).padStart(2, "0");
    return `UTC${sign}${h}:${m}`;
  } catch {
    return "UTC+00:00";
  }
}

export function getTimezoneAbbr(date: Date = new Date(), timezone: string): string {
  return getTimezoneFlag(timezone);
}

export function formatTimeInTimezone(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE,
  options: { hour12?: boolean; includeAbbr?: boolean } = {}
): string {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return "";

  const { hour12 = true, includeAbbr = false } = options;

  try {
    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12,
    });

    if (includeAbbr) {
      const flag = getTimezoneFlag(timezone);
      return flag ? `${timeStr} ${flag}` : timeStr;
    }

    return timeStr;
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
}

export function formatDateInTimezone(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }
): string {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return "";

  try {
    return d.toLocaleDateString("en-US", {
      timeZone: timezone,
      ...options,
    });
  } catch {
    return d.toLocaleDateString("en-US", options);
  }
}

export function getDatePartsInTimezone(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateStr: string;
  dayOfWeek: number;
} {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) {
    return { year: 2026, month: 1, day: 1, hour: 0, minute: 0, dateStr: "2026-01-01", dayOfWeek: 0 };
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "narrow",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";

    const year = parseInt(getVal("year"), 10);
    const month = parseInt(getVal("month"), 10);
    const day = parseInt(getVal("day"), 10);
    let hour = parseInt(getVal("hour"), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(getVal("minute"), 10);

    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;

    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const weekdayStr = dayFormatter.format(d).toLowerCase();
    const mapDays: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    const dayOfWeek = mapDays[weekdayStr.slice(0, 3)] ?? d.getDay();

    return { year, month, day, hour, minute, dateStr, dayOfWeek };
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      dayOfWeek: d.getDay(),
    };
  }
}

export function createDateFromTimezoneParts(
  dateStr: string,
  timeStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcGuess);
    const getPart = (type: string) => {
      const p = parts.find((pt) => pt.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };

    const targetYear = getPart("year");
    const targetMonth = getPart("month");
    const targetDay = getPart("day");
    let targetHour = getPart("hour");
    if (targetHour === 24) targetHour = 0;
    const targetMinute = getPart("minute");

    const targetAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);
    const offsetMs = targetAsUtc - utcGuess.getTime();

    return new Date(utcGuess.getTime() - offsetMs);
  } catch {
    return new Date(year, month - 1, day, hour, minute);
  }
}

export function getDualTimeDisplay(
  dateOrIso: Date | string | number,
  viewerTz: string = DEFAULT_TIMEZONE,
  baseTz: string = DEFAULT_TIMEZONE
): {
  viewerTime: string;
  viewerDateLabel: string;
  viewerTzAbbr: string;
  viewerOffset: string;
  baseTime: string;
  baseDateLabel: string;
  baseTzAbbr: string;
  baseOffset: string;
  isSameTimezone: boolean;
  diffSummary: string;
} {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;

  const viewerReg = getRegionalTimezone(viewerTz);
  const baseReg = getRegionalTimezone(baseTz);

  const viewerTime = formatTimeInTimezone(d, viewerTz);
  const viewerDateLabel = formatDateInTimezone(d, viewerTz, { weekday: "short", month: "short", day: "numeric" });
  const viewerTzAbbr = getTimezoneAbbr(d, viewerTz) || viewerReg.abbr;
  const viewerOffset = getTimezoneOffsetString(d, viewerTz);

  const baseTime = formatTimeInTimezone(d, baseTz);
  const baseDateLabel = formatDateInTimezone(d, baseTz, { weekday: "short", month: "short", day: "numeric" });
  const baseTzAbbr = getTimezoneAbbr(d, baseTz) || baseReg.abbr;
  const baseOffset = getTimezoneOffsetString(d, baseTz);

  const isSameTimezone = viewerTz === baseTz || viewerOffset === baseOffset;

  let diffSummary = "";
  if (!isSameTimezone) {
    diffSummary = `${viewerReg.flag} ${viewerTime} ${viewerTzAbbr} (${baseReg.flag} ${baseTime} ${baseTzAbbr})`;
  }

  return {
    viewerTime,
    viewerDateLabel,
    viewerTzAbbr,
    viewerOffset,
    baseTime,
    baseDateLabel,
    baseTzAbbr,
    baseOffset,
    isSameTimezone,
    diffSummary,
  };
}

export function format24hTo12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.trim().split(":");
  if (parts.length < 2) return time24;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1].padStart(2, "0");
  if (isNaN(hour)) return time24;

  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }

  return `${hour}:${minute} ${period}`;
}

export function format12hTo24h(time12: string): string {
  if (!time12) return "";
  const clean = time12.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return time12;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3];

  if (period === "PM" && hour < 12) {
    hour += 12;
  } else if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

export function formatForDateTimeInput(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const parts = getDatePartsInTimezone(dateOrIso, timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.dateStr}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function parseDateTimeInputInTimezone(
  dateTimeStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  if (!dateTimeStr) return new Date();
  const [datePart, timePart] = dateTimeStr.split("T");
  if (!datePart || !timePart) {
    const fallback = new Date(dateTimeStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }
  return createDateFromTimezoneParts(datePart, timePart.slice(0, 5), timezone);
}

export function formatForUser(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE,
  options: {
    includeDate?: boolean;
    includeTime?: boolean;
    includeAbbr?: boolean;
    weekday?: "short" | "long";
    month?: "short" | "long" | "numeric";
    year?: boolean;
  } = {}
): string {
  const {
    includeDate = true,
    includeTime = true,
    includeAbbr = true,
    weekday = "short",
    month = "short",
    year = true,
  } = options;

  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (!d || isNaN(d.getTime())) return "";

  const resolvedTz = timezone || DEFAULT_TIMEZONE;
  const parts: string[] = [];

  if (includeDate) {
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday,
      month,
      day: "numeric",
      ...(year ? { year: "numeric" } : {}),
    };
    parts.push(formatDateInTimezone(d, resolvedTz, dateOptions));
  }

  if (includeTime) {
    const timeStr = formatTimeInTimezone(d, resolvedTz, { hour12: true });
    if (includeAbbr) {
      const abbr = getTimezoneAbbr(d, resolvedTz);
      parts.push(abbr ? `${timeStr} ${abbr}` : timeStr);
    } else {
      parts.push(timeStr);
    }
  }

  return parts.join(", ");
}

export function toUTC(dateOrIso: Date | string | number): Date {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  return isNaN(d.getTime()) ? new Date() : d;
}

export function toUserTime(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
) {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  const parts = getDatePartsInTimezone(d, timezone);
  const timeStr = formatTimeInTimezone(d, timezone);
  const abbr = getTimezoneAbbr(d, timezone);
  return {
    ...parts,
    timeStr,
    abbr,
    formatted12h: format24hTo12h(`${parts.hour}:${parts.minute}`),
  };
}
