// Representative data using publicly available information
// Since Google retired the Representatives API endpoint in 2025, we maintain accurate federal data

interface RepresentativeData {
  name: string;
  office: string;
  party?: string;
  phones?: string[];
  emails?: string[];
  urls?: string[];
  photoUrl?: string;
  address?: Array<{
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>;
}

export const federalRepresentatives: RepresentativeData[] = [
  {
    name: "Donald Trump",
    office: "President of the United States",
    party: "Republican Party",
    phones: ["202-456-1414"],
    urls: ["https://www.whitehouse.gov"],
    address: [{
      line1: "1600 Pennsylvania Avenue NW",
      city: "Washington",
      state: "DC",
      zip: "20500"
    }]
  },
  {
    name: "JD Vance",
    office: "Vice President of the United States",
    party: "Republican Party",
    phones: ["202-456-1414"],
    urls: ["https://www.whitehouse.gov/administration/vice-president/"]
  }
];

export const stateRepresentativeTemplates = {
  governor: (state: string) => ({
    name: `Governor of ${state}`,
    office: "Governor",
    party: "Visit your state's official website",
    urls: [`https://www.usa.gov/state-government/${state.toLowerCase()}`]
  }),
  
  senator: (state: string, number: number) => ({
    name: `U.S. Senator from ${state} #${number}`,
    office: "U.S. Senator",
    party: "Visit www.senate.gov for current information",
    urls: ["https://www.senate.gov/senators/senators-contact.htm"]
  }),
  
  representative: (district: string) => ({
    name: `U.S. Representative for ${district}`,
    office: "U.S. Representative",
    party: "Visit www.house.gov for current information",
    urls: ["https://www.house.gov/representatives/find-your-representative"]
  })
};

export function createFallbackRepresentativeData(address: string) {
  const offices = [
    {
      name: "President of the United States",
      officialIndices: [0],
      levels: ["country"],
      roles: ["headOfState", "headOfGovernment"]
    },
    {
      name: "Vice President of the United States", 
      officialIndices: [1],
      levels: ["country"],
      roles: ["deputyHeadOfGovernment"]
    },
    {
      name: "Find Your Complete Representative List",
      officialIndices: [2],
      levels: ["all"]
    }
  ];

  const officials = [
    ...federalRepresentatives,
    {
      name: "Complete Representative Directory",
      office: "All Government Levels",
      party: "All Parties",
      urls: [
        "https://www.usa.gov/elected-officials",
        "https://ballotpedia.org/Who_represents_me",
        "https://www.govtrack.us/congress/members"
      ],
      phones: ["Use official websites for current contact info"],
      address: [{
        line1: "Visit the official government websites above",
        city: "to find your specific representatives",
        state: "All States",
        zip: "All ZIP codes"
      }]
    }
  ];

  return {
    offices,
    officials,
    kind: "civicinfo#representativeInfoResponse",
    normalizedInput: {
      locationName: address
    },
    fallbackMode: true,
    message: "Using curated federal data + official government links for complete representative information."
  };
}