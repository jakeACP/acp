import OpenAI from "openai";
import type { Representative, InsertRepresentative } from "@shared/schema";

// Initialize OpenAI client only when needed to avoid startup crashes
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface RepresentativeResponse {
  representatives: Array<{
    name: string;
    office: string;
    level: "federal" | "state" | "local";
    party?: string;
    electedDate?: string;
    termStart?: string;
    termEnd?: string;
    termLength?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    district?: string;
    state?: string;
  }>;
}

// Validation function to check if representative data is current
function validateRepresentativeTerms(rep: any): boolean {
  const now = new Date();
  
  // If we have term end date, check if it's current
  if (rep.termEnd) {
    const termEndDate = new Date(rep.termEnd);
    if (termEndDate < now) {
      console.warn(`Warning: ${rep.name} (${rep.office}) term ended on ${rep.termEnd}`);
      return false;
    }
  }
  
  // Check for realistic term lengths based on office
  const standardTerms: { [key: string]: number } = {
    'President': 4,
    'Vice President': 4,
    'U.S. Senator': 6,
    'Senator': 6,
    'U.S. Representative': 2,
    'Representative': 2,
    'Governor': 4,
    'Mayor': 4
  };
  
  const officeKey = Object.keys(standardTerms).find(key => 
    rep.office.toLowerCase().includes(key.toLowerCase())
  );
  
  if (officeKey && rep.termLength) {
    const expectedYears = standardTerms[officeKey];
    const actualYears = parseInt(rep.termLength.match(/(\d+)/)?.[1] || '0');
    
    if (actualYears !== expectedYears) {
      console.warn(`Warning: ${rep.name} (${rep.office}) has ${actualYears}-year term, expected ${expectedYears} years`);
    }
  }
  
  return true;
}

export async function findRepresentativesByZipCode(zipCode: string): Promise<InsertRepresentative[]> {
  try {
    const openai = getOpenAIClient();
    
    const prompt = `Find all CURRENTLY SERVING elected representatives for zip code ${zipCode} as of January 2025. Include federal (President, Vice President, Senators, House Representative), state (Governor, State Senator, State Representative), and local officials (Mayor, City Council, County officials) where possible.

IMPORTANT: Only include officials who are currently serving in office as of 2025. Verify election dates and terms.

For each representative, provide:
- Full name of CURRENT officeholder
- Office title (e.g., "President", "U.S. Senator", "Governor", "Mayor") 
- Level (federal, state, or local)
- Political party (if known)
- When they were last elected (YYYY-MM-DD format)
- Current term start date (YYYY-MM-DD format)
- Current term end date (YYYY-MM-DD format)
- Term length (e.g., "4 years", "6 years", "2 years")
- Phone number (if publicly available)
- Email address (if publicly available)
- Official website URL (if available)
- Office address (if available)
- District information (congressional district, state district, ward, etc.)
- State abbreviation

Note: Donald Trump is the current President (inaugurated January 2025), JD Vance is Vice President. Make sure all other officials are also current as of 2025.

Please respond with JSON in this exact format:
{
  "representatives": [
    {
      "name": "Full Name",
      "office": "Office Title",
      "level": "federal|state|local",
      "party": "Party Name",
      "electedDate": "YYYY-MM-DD",
      "termStart": "YYYY-MM-DD",
      "termEnd": "YYYY-MM-DD",
      "termLength": "X years",
      "phone": "Phone Number",
      "email": "Email Address",
      "website": "Website URL",
      "address": "Office Address",
      "district": "District Info",
      "state": "State Abbreviation"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides accurate information about elected representatives. Respond only with valid JSON data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result: RepresentativeResponse = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.representatives) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Validate representative data before processing
    const validatedReps = result.representatives.filter(rep => {
      const isValid = validateRepresentativeTerms(rep);
      if (!isValid) {
        console.log(`Skipping ${rep.name} due to validation issues`);
      }
      return isValid;
    });

    console.log(`Found ${result.representatives.length} representatives, ${validatedReps.length} passed validation`);

    // Convert to our Representative format (omit id to let database generate it)
    return validatedReps.map(rep => ({
      name: rep.name,
      office: rep.office,
      level: rep.level,
      party: rep.party || null,
      phone: rep.phone || null,
      email: rep.email || null,
      website: rep.website || null,
      address: rep.address || null,
      photoUrl: null, // Could be enhanced later
      district: rep.district || null,
      state: rep.state || null,
      zipCodes: [zipCode], // Associate with the searched zip code
      // Election and term tracking
      electedDate: rep.electedDate ? new Date(rep.electedDate) : null,
      termStart: rep.termStart ? new Date(rep.termStart) : null,
      termEnd: rep.termEnd ? new Date(rep.termEnd) : null,
      termLength: rep.termLength || null,
      isCurrentlyServing: true, // We only ask for current officials
      lastVerified: new Date(),
      verificationSource: "chatgpt",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  } catch (error) {
    console.error("Error finding representatives:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to find representatives for zip code ${zipCode}: ${errorMessage}`);
  }
}