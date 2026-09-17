export type MnDistrictType = "state_house" | "state_senate" | "congressional" | "county_commissioner";

export interface MnDistrict {
  id: string;
  type: MnDistrictType;
  code: string;
  label: string;
  county: string | null;
}

export interface MnPrecinctProperties {
  id: string;
  name: string;
  county: string;
  districts: Partial<Record<MnDistrictType, string>>;
}

export interface MnBoundaryMetadata {
  publisher: string;
  sourceUrl: string;
  sourceDate: string;
  retrievedAt: string;
  snapshotId: string;
  precinctCount: number;
}

export interface MnBoundaryIndex {
  metadata: MnBoundaryMetadata;
  districts: MnDistrict[];
}

export interface MnAddressMatch {
  status: "matched" | "ambiguous" | "unmatched";
  precinct: MnPrecinctProperties | null;
  districts: MnDistrict[];
}

export interface MnCampaign {
  id: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  profileId: string | null;
  officeTitle: string;
  electionYear: number | null;
  filingStatus: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
}

export interface MnCampaignResponse {
  district: MnDistrict;
  campaigns: MnCampaign[];
  electionYear: number;
}