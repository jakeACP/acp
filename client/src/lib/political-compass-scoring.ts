import type { CompassQuestion } from "./political-compass-config";

export interface ScoreResult {
  economicScore: number;
  socialScore: number;
  economicRaw: number;
  socialRaw: number;
  economicMax: number;
  socialMax: number;
}

/**
 * Calculate normalised -10 to +10 scores for both axes.
 * answerValue is -2 / -1 / 0 / +1 / +2 (Likert).
 * questionScore = answerValue * question.direction
 */
export function calculateScores(
  answers: Record<number, number>,
  questions: CompassQuestion[]
): ScoreResult {
  let economicRaw = 0;
  let socialRaw = 0;
  let economicCount = 0;
  let socialCount = 0;

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer === undefined) continue;
    const score = answer * q.direction;
    if (q.axis === "economic") {
      economicRaw += score;
      economicCount++;
    } else {
      socialRaw += score;
      socialCount++;
    }
  }

  const economicMax = economicCount * 2;
  const socialMax = socialCount * 2;

  const economicScore =
    economicMax > 0 ? Math.round(((economicRaw / economicMax) * 10) * 10) / 10 : 0;
  const socialScore =
    socialMax > 0 ? Math.round(((socialRaw / socialMax) * 10) * 10) / 10 : 0;

  return { economicScore, socialScore, economicRaw, socialRaw, economicMax, socialMax };
}

/**
 * Classify the user into a named quadrant given normalised scores.
 */
export function getQuadrant(economicScore: number, socialScore: number): string {
  if (Math.abs(economicScore) < 2 && Math.abs(socialScore) < 2) return "Pragmatic Centrist";
  if (economicScore <= -2 && socialScore <= -2) return "Community Libertarian";
  if (economicScore <= -2 && socialScore >= 2)  return "State Progressive";
  if (economicScore >= 2  && socialScore <= -2) return "Market Libertarian";
  if (economicScore >= 2  && socialScore >= 2)  return "National Conservative";
  return "Mixed / Issue-by-Issue Voter";
}

/**
 * Return a human-readable plain-English explanation based on scores.
 */
export function getResultSummary(economicScore: number, socialScore: number): string {
  let economic = "";
  if (economicScore < -4)       economic = "You tend to strongly support public investment, worker protections, and government action to reduce inequality.";
  else if (economicScore < -1)  economic = "You lean toward economic interventionism, preferring government programs and worker protections over pure market solutions.";
  else if (economicScore <= 1)  economic = "Your economic views are balanced, combining market-friendly and public-sector perspectives.";
  else if (economicScore <= 4)  economic = "You lean toward market-based solutions, lower regulation, and limited government economic intervention.";
  else                          economic = "You tend to strongly support free markets, private enterprise, low taxes, and minimal government economic control.";

  let social = "";
  if (socialScore < -4)       social = "You place high value on civil liberties, personal freedom, privacy, and strict limits on government authority.";
  else if (socialScore < -1)  social = "You lean libertarian on social issues, prioritising individual freedom and checks on institutional power.";
  else if (socialScore <= 1)  social = "Your social views are mixed, balancing personal freedom with the need for some institutional structure.";
  else if (socialScore <= 4)  social = "You lean toward emphasising order, tradition, and institutional authority on social matters.";
  else                        social = "You place high value on public order, tradition, national security, and strong institutional authority.";

  return `${economic}\n\n${social}`;
}

/**
 * Format a score for display, e.g. +7.2 or -3.5
 */
export function formatScore(score: number): string {
  return score >= 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
}
