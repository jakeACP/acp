export interface CompassQuestion {
  id: number;
  text: string;
  axis: "economic" | "social";
  direction: 1 | -1;
}

export interface CompassResult {
  economicScore: number;
  socialScore: number;
  quadrant: string;
  completedAt: string;
}

export const COMPASS_QUESTIONS: CompassQuestion[] = [
  // Economic axis (ids 1–10)
  { id: 1,  text: "The government should do more to reduce income inequality.", axis: "economic", direction: -1 },
  { id: 2,  text: "Taxes should generally be lower, even if that means fewer government services.", axis: "economic", direction: 1 },
  { id: 3,  text: "Healthcare should be guaranteed as a basic public service.", axis: "economic", direction: -1 },
  { id: 4,  text: "Private businesses usually solve problems better than government programs.", axis: "economic", direction: 1 },
  { id: 5,  text: "Large corporations should face stricter rules to protect workers and consumers.", axis: "economic", direction: -1 },
  { id: 6,  text: "People should mostly be responsible for their own financial success or failure.", axis: "economic", direction: 1 },
  { id: 7,  text: "Public funding should be increased for education, housing, and infrastructure.", axis: "economic", direction: -1 },
  { id: 8,  text: "Government regulation often hurts economic growth more than it helps.", axis: "economic", direction: 1 },
  { id: 9,  text: "Workers should have stronger legal protections to organize and negotiate with employers.", axis: "economic", direction: -1 },
  { id: 10, text: "Free markets should be trusted more than government planning.", axis: "economic", direction: 1 },

  // Social axis (ids 11–20)
  { id: 11, text: "People should be free to live however they want as long as they are not harming others.", axis: "social", direction: -1 },
  { id: 12, text: "The government should have stronger powers to maintain public order.", axis: "social", direction: 1 },
  { id: 13, text: "Freedom of speech should be protected even when the speech is offensive or unpopular.", axis: "social", direction: -1 },
  { id: 14, text: "National security sometimes requires limiting individual privacy.", axis: "social", direction: 1 },
  { id: 15, text: "Adults should generally be allowed to make their own personal lifestyle choices without government interference.", axis: "social", direction: -1 },
  { id: 16, text: "Schools should place more emphasis on discipline, tradition, and respect for authority.", axis: "social", direction: 1 },
  { id: 17, text: "Police and government agencies should face stronger oversight when individual rights are at stake.", axis: "social", direction: -1 },
  { id: 18, text: "Society works best when people follow traditional social expectations.", axis: "social", direction: 1 },
  { id: 19, text: "Peaceful protest should be strongly protected, even when it disrupts normal activity.", axis: "social", direction: -1 },
  { id: 20, text: "The government should be able to restrict certain behaviors if they are considered harmful to society.", axis: "social", direction: 1 },
];

export const QUADRANT_INFO: Record<string, { label: string; color: string; description: string }> = {
  "Community Libertarian": {
    label: "Community Libertarian",
    color: "#10b981",
    description:
      "You support economic fairness, public investment, and civil liberties — combining left-leaning economics with strong personal freedoms and limits on government authority.",
  },
  "State Progressive": {
    label: "State Progressive",
    color: "#ef4444",
    description:
      "You favor economic intervention, public programs, and stronger government authority to improve society — combining left-leaning economics with support for institutional order.",
  },
  "Market Libertarian": {
    label: "Market Libertarian",
    color: "#f59e0b",
    description:
      "You support free markets, low regulation, and personal freedom — combining right-leaning economics with strong opposition to government authority over individuals.",
  },
  "National Conservative": {
    label: "National Conservative",
    color: "#6366f1",
    description:
      "You favor market-oriented economics, traditional institutions, law and order, and stronger national authority — combining right-leaning economics with support for social order.",
  },
  "Pragmatic Centrist": {
    label: "Pragmatic Centrist",
    color: "#64748b",
    description:
      "Your views are mixed across both economic and social issues. You may prefer evaluating policies on a case-by-case basis rather than following a fixed ideology.",
  },
  "Mixed / Issue-by-Issue Voter": {
    label: "Mixed / Issue-by-Issue Voter",
    color: "#8b5cf6",
    description:
      "You hold a combination of views that don't fit neatly into one quadrant. You likely weigh each issue individually based on its specifics rather than a single ideological framework.",
  },
};

export const LIKERT_OPTIONS = [
  { value: -2, label: "Strongly\nDisagree" },
  { value: -1, label: "Disagree" },
  { value:  0, label: "Neutral /\nUnsure" },
  { value:  1, label: "Agree" },
  { value:  2, label: "Strongly\nAgree" },
];
