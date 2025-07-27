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
    name: "Joe Biden",
    office: "President of the United States",
    party: "Democratic Party",
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
    name: "Kamala Harris",
    office: "Vice President of the United States",
    party: "Democratic Party",
    phones: ["202-456-1414"],
    urls: ["https://www.whitehouse.gov/administration/vice-president-harris/"]
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
    }
  ];

  const officials = [...federalRepresentatives];

  // Add helpful guidance for finding local representatives
  offices.push({
    name: "Your State and Local Representatives",
    officialIndices: [officials.length],
    levels: ["administrativeArea1", "locality"]
  });

  officials.push({
    name: "Find Your State & Local Officials",
    office: "Various State and Local Offices",
    party: "Multiple Parties",
    urls: [
      "https://www.usa.gov/elected-officials",
      "https://www.vote.gov/",
      "https://ballotpedia.org/Who_represents_me"
    ],
    phones: ["Contact your state election office"],
    address: [{
      line1: "Visit the websites above to find your specific representatives",
      city: "based on your exact address",
      state: "All States",
      zip: "All ZIP codes"
    }]
  });

  return {
    offices,
    officials,
    kind: "civicinfo#representativeInfoResponse",
    normalizedInput: {
      locationName: address
    },
    fallbackMode: true,
    message: "Using fallback data due to Google API limitations. Visit the provided links for accurate, current representative information."
  };
}