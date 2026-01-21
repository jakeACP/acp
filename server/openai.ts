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

// Check if a representative's term has expired
export function hasTermExpired(representative: any): boolean {
  if (!representative.termEnd) {
    return false; // No term end date, assume still current
  }
  
  const termEndDate = new Date(representative.termEnd);
  const now = new Date();
  
  return termEndDate < now;
}

// Query ChatGPT for current officeholder of a specific position
export async function findCurrentOfficeholder(office: string, district?: string, state?: string): Promise<InsertRepresentative | null> {
  try {
    const openai = getOpenAIClient();
    
    let locationInfo = "";
    if (state) locationInfo += ` in ${state}`;
    if (district) locationInfo += ` (${district})`;
    
    const prompt = `Who is the current ${office}${locationInfo} as of January 2025? 

IMPORTANT: Only provide information about the CURRENT officeholder who is serving right now in 2025.

Please provide:
- Full name of current officeholder
- Political party
- When they were last elected (YYYY-MM-DD format)
- Current term start date (YYYY-MM-DD format)  
- Current term end date (YYYY-MM-DD format)
- Term length (e.g., "4 years", "6 years", "2 years")
- Phone number (if publicly available)
- Email address (if publicly available)
- Official website URL
- Office address
- District information (if applicable)

If the position is vacant or unknown, respond with: {"vacant": true}

Please respond with JSON in this exact format:
{
  "name": "Full Name",
  "office": "${office}",
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
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides accurate information about current elected representatives. Respond only with valid JSON data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (result.vacant) {
      return null; // Position is vacant
    }

    if (!result.name) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Convert to our Representative format
    return {
      name: result.name,
      office: result.office || office,
      level: result.level || "federal",
      party: result.party || null,
      phone: result.phone || null,
      email: result.email || null,
      website: result.website || null,
      address: result.address || null,
      photoUrl: null,
      district: result.district || district || null,
      state: result.state || state || null,
      zipCodes: [],
      electedDate: result.electedDate ? new Date(result.electedDate) : null,
      termStart: result.termStart ? new Date(result.termStart) : null,
      termEnd: result.termEnd ? new Date(result.termEnd) : null,
      termLength: result.termLength || null,
      isCurrentlyServing: true,
      lastVerified: new Date(),
      verificationSource: "chatgpt",
    };

  } catch (error) {
    console.error("Error finding current officeholder:", error);
    return null;
  }
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
      district: rep.district || null,
      state: rep.state || null,
      zipCodes: [],
      electedDate: rep.electedDate ? new Date(rep.electedDate) : null,
      termStart: rep.termStart ? new Date(rep.termStart) : null,
      termEnd: rep.termEnd ? new Date(rep.termEnd) : null,
      termLength: rep.termLength || null,
      isCurrentlyServing: true,
      lastVerified: new Date(),
      verificationSource: "chatgpt",
      photoUrl: null,
    }));

  } catch (error) {
    console.error("Error finding representatives:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to find representatives for zip code ${zipCode}: ${errorMessage}`);
  }
}

// Step 1: Generate a political seat based on user search query
export async function generatePoliticalSeat(query: string): Promise<{ seat: string; level: string; jurisdiction: string }> {
  try {
    const openai = getOpenAIClient();
    
    const prompt = `Based on the user's search query: "${query}", determine what political seat or office they're asking about.

Examples:
- "mayor of chicago" → seat: "Mayor", level: "local", jurisdiction: "Chicago"
- "california senator" → seat: "U.S. Senator", level: "state", jurisdiction: "California"
- "ny governor" → seat: "Governor", level: "state", jurisdiction: "New York"
- "house representative district 5" → seat: "U.S. Representative", level: "federal", jurisdiction: "District 5"

Respond with JSON in this exact format:
{
  "seat": "The political office title (e.g., Mayor, Governor, U.S. Senator)",
  "level": "federal|state|local",
  "jurisdiction": "The geographic jurisdiction or district"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that identifies political seats and offices. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      seat: result.seat || "",
      level: result.level || "local",
      jurisdiction: result.jurisdiction || ""
    };
  } catch (error) {
    console.error("Error generating political seat:", error);
    throw error;
  }
}

// Step 2: Generate candidate profiles for a specific seat
export async function generateCandidateProfiles(seat: string, level: string, jurisdiction: string): Promise<Array<{ name: string; party: string; bio: string; position: string; experience: string }>> {
  try {
    const openai = getOpenAIClient();
    
    const prompt = `Generate 3-5 realistic candidate profiles for the ${level} ${seat} position in ${jurisdiction} as of January 2025.

For each candidate, provide:
- Full name (realistic name)
- Political party
- Brief biography (2-3 sentences)
- Main position/platform (1-2 sentences)
- Relevant experience (education, prior offices, career)

Respond with JSON in this exact format:
{
  "candidates": [
    {
      "name": "Full Name",
      "party": "Party Name",
      "bio": "Brief biography...",
      "position": "Main platform/position...",
      "experience": "Relevant experience..."
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a political analyst generating realistic candidate profiles. Respond only with valid JSON. Create diverse, plausible candidates."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.candidates || [];
  } catch (error) {
    console.error("Error generating candidate profiles:", error);
    throw error;
  }
}

// Article type options for AI generation
const ARTICLE_TYPES = [
  "current-events",
  "politicians", 
  "proposals",
  "issues",
  "donors",
  "propaganda",
  "conspiracies",
  "legal-cases",
  "leaks"
] as const;

interface GeneratedArticle {
  title: string;
  excerpt: string;
  articleBody: string;
  articleType: typeof ARTICLE_TYPES[number];
  tags: string[];
  suggestedImages: string[];
}

interface GeneratedArticleBody {
  articleBody: string;
  excerpt: string;
}

interface AiArticleParams {
  systemPrompt: string;
  writingStyle: string;
  toneGuidelines: string;
  focusAreas: string;
  contentLength: string;
  includeQuotes: boolean;
  includeSources: boolean;
  additionalInstructions: string | null;
}

// Generate only article body content using title and AI parameters
export async function generateArticleBodyFromTitle(title: string, params: AiArticleParams): Promise<GeneratedArticleBody> {
  try {
    const openai = getOpenAIClient();
    
    const lengthGuidance = {
      short: "Write a concise article of 3-4 paragraphs (about 300-400 words).",
      medium: "Write a comprehensive article of 5-7 paragraphs (about 600-800 words).",
      long: "Write an in-depth article of 8-12 paragraphs (about 1000-1500 words)."
    };

    let instructions = `Write an article with this title: "${title}"

Writing Style: ${params.writingStyle}
Tone: ${params.toneGuidelines}
Focus Areas: ${params.focusAreas}
${lengthGuidance[params.contentLength as keyof typeof lengthGuidance] || lengthGuidance.medium}
${params.includeQuotes ? "Include relevant quotes where appropriate." : "Do not include quotes."}
${params.includeSources ? "Reference sources and provide context for claims." : ""}
${params.additionalInstructions ? `Additional Instructions: ${params.additionalInstructions}` : ""}

Write the article body content formatted with HTML tags: <p> for paragraphs, <h2> and <h3> for subheadings, <blockquote> for quotes, <ul>/<li> for lists.

Also generate a compelling short description/excerpt (2-3 sentences, max 300 characters) that summarizes the article and hooks readers.

Return a JSON object with this structure:
{"articleBody": "<p>Your article content here...</p>", "excerpt": "Short engaging description..."}`;

    console.log("Generating article for title:", title);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: params.systemPrompt || "You are a professional journalist writing for a political reform organization."
        },
        {
          role: "user",
          content: instructions
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    console.log("OpenAI response received, length:", content?.length);
    
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    
    const result = JSON.parse(content);
    
    if (!result.articleBody) {
      console.error("No articleBody in response:", JSON.stringify(result).substring(0, 200));
      throw new Error("OpenAI response missing articleBody field");
    }
    
    return {
      articleBody: result.articleBody,
      excerpt: result.excerpt || ""
    };
  } catch (error) {
    console.error("Error generating article body:", error);
    throw error;
  }
}

// Generate article content using AI based on a topic or URL (legacy function)
export async function generateArticleContent(topic: string): Promise<GeneratedArticle> {
  try {
    const openai = getOpenAIClient();
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    
    const prompt = `You are a journalist for the Anti-Corruption Party (ACP), a grassroots political movement focused on transparency, accountability, and democratic reform. 

Generate a complete news article about the following topic: "${topic}"

The article should be well-researched, factual, and written in a professional journalistic style. Focus on exposing corruption, holding politicians accountable, and promoting transparency in government.

IMPORTANT: Choose the most appropriate article type from these options:
- current-events: Breaking news and recent developments
- politicians: Coverage of political figures and their actions
- proposals: Policy proposals and legislative initiatives
- issues: Important social and political issues
- donors: Campaign finance and political donations
- propaganda: Analysis of political messaging and spin
- conspiracies: Investigation of alleged cover-ups or hidden activities
- legal-cases: Court cases and legal proceedings
- leaks: Whistleblower information and leaked documents

Generate the response as JSON with this exact structure:
{
  "title": "Compelling headline that captures the story",
  "excerpt": "2-3 sentence summary that hooks readers (max 300 chars)",
  "articleBody": "Full article content in HTML format with <p>, <h2>, <h3>, <blockquote>, <ul>, <li> tags. Include at least 4-5 paragraphs with proper structure.",
  "articleType": "one of the type options above",
  "tags": ["array", "of", "relevant", "tags"],
  "suggestedImages": ["description of image 1 that would fit this article", "description of image 2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an investigative journalist writing for a political transparency organization. Your articles should be factual, well-sourced, and focused on accountability and democratic reform."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and sanitize the response
    return {
      title: result.title || "Untitled Article",
      excerpt: result.excerpt?.slice(0, 500) || "",
      articleBody: result.articleBody || "<p>Article content goes here.</p>",
      articleType: ARTICLE_TYPES.includes(result.articleType) ? result.articleType : "current-events",
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 10) : [],
      suggestedImages: Array.isArray(result.suggestedImages) ? result.suggestedImages : []
    };
  } catch (error) {
    console.error("Error generating article content:", error);
    throw error;
  }
}