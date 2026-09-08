export interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
}

export const COUNTRIES: Country[] = [
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", dialCode: "+44" },
  { name: "Sri Lanka", code: "LK", flag: "🇱🇰", dialCode: "+94" },
  { name: "United States", code: "US", flag: "🇺🇸", dialCode: "+1" },
  { name: "India", code: "IN", flag: "🇮🇳", dialCode: "+91" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪", dialCode: "+971" },
  { name: "Qatar", code: "QA", flag: "🇶🇦", dialCode: "+974" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦", dialCode: "+966" },
  { name: "Singapore", code: "SG", flag: "🇸🇬", dialCode: "+65" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾", dialCode: "+60" },
  { name: "Canada", code: "CA", flag: "🇨🇦", dialCode: "+1" },
  { name: "Australia", code: "AU", flag: "🇦🇺", dialCode: "+61" },
  { name: "Pakistan", code: "PK", flag: "🇵🇰", dialCode: "+92" },
  { name: "Bangladesh", code: "BD", flag: "🇧🇩", dialCode: "+880" },
  { name: "Maldives", code: "MV", flag: "🇲🇻", dialCode: "+960" },
  { name: "Kuwait", code: "KW", flag: "🇰🇼", dialCode: "+965" },
  { name: "Oman", code: "OM", flag: "🇴🇲", dialCode: "+968" },
  { name: "Bahrain", code: "BH", flag: "🇧🇭", dialCode: "+973" },
  { name: "Hong Kong", code: "HK", flag: "🇭🇰", dialCode: "+852" },
  { name: "China", code: "CN", flag: "🇨🇳", dialCode: "+86" },
  { name: "Germany", code: "DE", flag: "🇩🇪", dialCode: "+49" },
  { name: "France", code: "FR", flag: "🇫🇷", dialCode: "+33" },
  { name: "Italy", code: "IT", flag: "🇮🇹", dialCode: "+39" },
  { name: "Spain", code: "ES", flag: "🇪🇸", dialCode: "+34" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱", dialCode: "+31" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭", dialCode: "+41" },
  { name: "Ireland", code: "IE", flag: "🇮🇪", dialCode: "+353" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", dialCode: "+64" },
  { name: "Japan", code: "JP", flag: "🇯🇵", dialCode: "+81" },
  { name: "South Korea", code: "KR", flag: "🇰🇷", dialCode: "+82" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", dialCode: "+27" },
  { name: "Nigeria", code: "NG", flag: "🇳🇬", dialCode: "+234" },
  { name: "Kenya", code: "KE", flag: "🇰🇪", dialCode: "+254" },
  { name: "Egypt", code: "EG", flag: "🇪🇬", dialCode: "+20" },
  { name: "Ghana", code: "GH", flag: "🇬🇭", dialCode: "+233" },
  { name: "Zimbabwe", code: "ZW", flag: "🇿🇼", dialCode: "+263" },
  { name: "Mauritius", code: "MU", flag: "🇲🇺", dialCode: "+230" },
  { name: "Cyprus", code: "CY", flag: "🇨🇾", dialCode: "+357" },
  { name: "Greece", code: "GR", flag: "🇬🇷", dialCode: "+30" },
  { name: "Turkey", code: "TR", flag: "🇹🇷", dialCode: "+90" },
  { name: "Jordan", code: "JO", flag: "🇯🇴", dialCode: "+962" },
  { name: "Lebanon", code: "LB", flag: "🇱🇧", dialCode: "+961" },
  { name: "Nepal", code: "NP", flag: "🇳🇵", dialCode: "+977" },
  { name: "Thailand", code: "TH", flag: "🇹🇭", dialCode: "+66" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳", dialCode: "+84" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩", dialCode: "+62" },
  { name: "Philippines", code: "PH", flag: "🇵🇭", dialCode: "+63" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", dialCode: "+55" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", dialCode: "+52" },
  { name: "Argentina", code: "AR", flag: "🇦🇷", dialCode: "+54" },
  { name: "Chile", code: "CL", flag: "🇨🇱", dialCode: "+56" },
  { name: "Colombia", code: "CO", flag: "🇨🇴", dialCode: "+57" },
  { name: "Peru", code: "PE", flag: "🇵🇪", dialCode: "+51" },
  { name: "Poland", code: "PL", flag: "🇵🇱", dialCode: "+48" },
  { name: "Austria", code: "AT", flag: "🇦🇹", dialCode: "+43" },
  { name: "Belgium", code: "BE", flag: "🇧🇪", dialCode: "+32" },
  { name: "Portugal", code: "PT", flag: "🇵🇹", dialCode: "+351" },
  { name: "Sweden", code: "SE", flag: "🇸🇪", dialCode: "+46" },
  { name: "Norway", code: "NO", flag: "🇳🇴", dialCode: "+47" },
  { name: "Denmark", code: "DK", flag: "🇩🇰", dialCode: "+45" },
  { name: "Finland", code: "FI", flag: "🇫🇮", dialCode: "+358" },
  { name: "Czech Republic", code: "CZ", flag: "🇨🇿", dialCode: "+420" },
  { name: "Hungary", code: "HU", flag: "🇭🇺", dialCode: "+36" },
  { name: "Romania", code: "RO", flag: "🇷🇴", dialCode: "+40" },
  { name: "Ukraine", code: "UA", flag: "🇺🇦", dialCode: "+380" },
  { name: "Russia", code: "RU", flag: "🇷🇺", dialCode: "+7" },
  { name: "Kazakhstan", code: "KZ", flag: "🇰🇿", dialCode: "+7" },
  { name: "Uzbekistan", code: "UZ", flag: "🇺🇿", dialCode: "+998" },
  { name: "Azerbaijan", code: "AZ", flag: "🇦🇿", dialCode: "+994" },
  { name: "Georgia", code: "GE", flag: "🇬🇪", dialCode: "+995" },
  { name: "Armenia", code: "AM", flag: "🇦🇲", dialCode: "+374" },
  { name: "Israel", code: "IL", flag: "🇮🇱", dialCode: "+972" },
  { name: "Iraq", code: "IQ", flag: "🇮🇶", dialCode: "+964" },
  { name: "Iran", code: "IR", flag: "🇮🇷", dialCode: "+98" },
  { name: "Morocco", code: "MA", flag: "🇲🇦", dialCode: "+212" },
  { name: "Tunisia", code: "TN", flag: "🇹🇳", dialCode: "+216" },
  { name: "Algeria", code: "DZ", flag: "🇩🇿", dialCode: "+213" },
  { name: "Ethiopia", code: "ET", flag: "🇪🇹", dialCode: "+251" },
  { name: "Uganda", code: "UG", flag: "🇺🇬", dialCode: "+256" },
  { name: "Tanzania", code: "TZ", flag: "🇹🇿", dialCode: "+255" },
  { name: "Zambia", code: "ZM", flag: "🇿🇲", dialCode: "+260" },
  { name: "Botswana", code: "BW", flag: "🇧🇼", dialCode: "+267" },
  { name: "Namibia", code: "NA", flag: "🇳🇦", dialCode: "+264" },
  { name: "Trinidad and Tobago", code: "TT", flag: "🇹🇹", dialCode: "+1" },
  { name: "Jamaica", code: "JM", flag: "🇯🇲", dialCode: "+1" },
  { name: "Barbados", code: "BB", flag: "🇧🇧", dialCode: "+1" },
  { name: "Bahamas", code: "BS", flag: "🇧🇸", dialCode: "+1" },
  { name: "Fiji", code: "FJ", flag: "🇫🇯", dialCode: "+679" },
  { name: "Papua New Guinea", code: "PG", flag: "🇵🇬", dialCode: "+675" },
  { name: "Brunei", code: "BN", flag: "🇧🇳", dialCode: "+673" },
  { name: "Cambodia", code: "KH", flag: "🇰🇭", dialCode: "+855" },
  { name: "Myanmar", code: "MM", flag: "🇲🇲", dialCode: "+95" },
  { name: "Mongolia", code: "MN", flag: "🇲🇳", dialCode: "+976" },
  { name: "Iceland", code: "IS", flag: "🇮🇸", dialCode: "+354" },
  { name: "Luxembourg", code: "LU", flag: "🇱🇺", dialCode: "+352" },
  { name: "Malta", code: "MT", flag: "🇲🇹", dialCode: "+356" },
];

export function findCountry(query: string): Country | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === q ||
      c.code.toLowerCase() === q ||
      c.dialCode.toLowerCase() === q ||
      c.name.toLowerCase().startsWith(q)
  );
}

export function findCountryByDialCode(dialCode: string): Country | undefined {
  if (!dialCode) return undefined;
  const cleaned = dialCode.trim();
  return COUNTRIES.find((c) => c.dialCode === cleaned || cleaned.startsWith(c.dialCode));
}
