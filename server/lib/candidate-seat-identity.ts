const STATE_ABBRS: Record<string, string> = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA",
  COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE", FLORIDA: "FL", GEORGIA: "GA",
  HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS",
  KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA",
  MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT",
  NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND",
  OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT",
  VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV",
  WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC", "WASHINGTON D.C.": "DC",
  "PUERTO RICO": "PR",
};
const ABBRS = new Set(Object.values(STATE_ABBRS));

export function normalizeCandidateState(value?: string | null): string | null {
  const upper = (value || "").trim().toUpperCase();
  if (!upper) return null;
  if (ABBRS.has(upper)) return upper;
  if (STATE_ABBRS[upper]) return STATE_ABBRS[upper];
  for (const [name, abbr] of Object.entries(STATE_ABBRS)) {
    if (upper.includes(name)) return abbr;
  }
  const match = upper.match(/\b([A-Z]{2})\b/);
  return match && ABBRS.has(match[1]) ? match[1] : null;
}

export function normalizeCandidateDistrict(value?: string | null): string | null {
  const upper = (value || "").trim().toUpperCase();
  if (!upper || ["STATEWIDE", "AT LARGE", "AT-LARGE"].includes(upper)) return "STATEWIDE";
  const match = upper.match(/(?:DISTRICT|CD|HD|SD)?\s*0*(\d+[A-Z]?)/);
  return match?.[1] || null;
}

export function normalizeCandidateLevel(value?: string | null): "federal" | "state" | null {
  const lower = (value || "").trim().toLowerCase();
  if (lower.includes("federal") || lower.includes("congress") || lower === "us") return "federal";
  if (lower.includes("state")) return "state";
  return null;
}

export function normalizeCandidateOffice(value?: string | null): string | null {
  const lower = (value || "").toLowerCase();
  if (/\bsenat(or|e)\b/.test(lower)) return "senate";
  if (/\b(house|representative|congressional)\b/.test(lower)) return "house";
  if (lower.includes("lieutenant governor")) return "lieutenant-governor";
  if (lower.includes("governor")) return "governor";
  if (lower.includes("attorney general")) return "attorney-general";
  if (lower.includes("secretary of state")) return "secretary-of-state";
  if (lower.includes("state auditor") || lower === "auditor") return "state-auditor";
  if (lower.includes("president")) return "president";
  const cleaned = lower.replace(/[–—-]/g, " ").replace(/\b(?:district|cd|hd|sd)\s*\d+[a-z]?\b/g, "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export function candidateSeatKey(input: {
  office: string | null;
  officeType?: string | null;
  level: string | null;
  state: string | null;
  district: string | null;
  storedTitle?: string | null;
}): string | null {
  const state = normalizeCandidateState(input.state) || normalizeCandidateState(input.storedTitle);
  const level = normalizeCandidateLevel(input.level);
  const office = normalizeCandidateOffice(`${input.officeType || ""} ${input.office || ""}`);
  const hasDistrictInTitle = /\b(?:district|cd|hd|sd)\s*\d+[a-z]?\b/i.test(input.storedTitle || "");
  const district = input.district
    ? normalizeCandidateDistrict(input.district)
    : hasDistrictInTitle ? normalizeCandidateDistrict(input.storedTitle) : "STATEWIDE";
  return state && level && office && district ? `${state}|${level}|${office}|${district}` : null;
}

export function expectedFederalSeatKey(fecCandidateId: string | null): string | null {
  if (!fecCandidateId) return null;
  const match = fecCandidateId.trim().toUpperCase().match(/^([HS])\d([A-Z]{2})(\d{2})/);
  if (!match || !normalizeCandidateState(match[2])) return null;
  const office = match[1] === "H" ? "house" : "senate";
  const district = office === "senate" || match[3] === "00"
    ? "STATEWIDE"
    : String(Number(match[3]));
  return `${match[2]}|federal|${office}|${district}`;
}

export function uniqueCandidateSeatMatch<T>(
  items: T[],
  expectedKey: string,
  getKey: (item: T) => string | null,
): { match: T | null; ambiguous: boolean } {
  const matches = items.filter(item => getKey(item) === expectedKey);
  return {
    match: matches.length === 1 ? matches[0] : null,
    ambiguous: matches.length > 1,
  };
}