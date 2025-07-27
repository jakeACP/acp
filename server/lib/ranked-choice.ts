// Ranked Choice Voting (Instant Runoff Voting) Implementation

export interface RankedBallot {
  userId: string;
  choices: string[]; // Array of option IDs in preference order
}

export interface RankedChoiceResult {
  winner: string | null;
  rounds: RoundResult[];
  totalBallots: number;
  eliminationOrder: string[];
}

export interface RoundResult {
  round: number;
  voteCounts: Record<string, number>;
  totalVotes: number;
  eliminated?: string;
  winner?: string;
  majorityThreshold: number;
}

export class RankedChoiceCalculator {
  private candidates: Set<string>;
  private ballots: RankedBallot[];

  constructor(candidates: string[], ballots: RankedBallot[]) {
    this.candidates = new Set(candidates);
    this.ballots = this.validateBallots(ballots);
  }

  // Validate ballots to ensure they only contain valid candidates
  private validateBallots(ballots: RankedBallot[]): RankedBallot[] {
    return ballots.map(ballot => ({
      ...ballot,
      choices: ballot.choices.filter(choice => this.candidates.has(choice))
    })).filter(ballot => ballot.choices.length > 0);
  }

  // Count first-choice votes for remaining candidates
  private countVotes(remainingCandidates: Set<string>): Record<string, number> {
    const voteCounts: Record<string, number> = {};
    
    // Initialize all remaining candidates with 0 votes
    remainingCandidates.forEach(candidate => {
      voteCounts[candidate] = 0;
    });

    // Count first-choice votes from each ballot
    this.ballots.forEach(ballot => {
      const firstChoice = ballot.choices.find(choice => 
        remainingCandidates.has(choice)
      );
      
      if (firstChoice) {
        voteCounts[firstChoice]++;
      }
    });

    return voteCounts;
  }

  // Find candidate(s) with minimum votes for elimination
  private findCandidateToEliminate(voteCounts: Record<string, number>): string {
    const minVotes = Math.min(...Object.values(voteCounts));
    const candidatesWithMinVotes = Object.keys(voteCounts)
      .filter(candidate => voteCounts[candidate] === minVotes);
    
    // Simple tie-breaking: eliminate first candidate alphabetically
    // In production, you might want more sophisticated tie-breaking
    return candidatesWithMinVotes.sort()[0];
  }

  // Check if any candidate has a majority (>50%)
  private checkForMajority(voteCounts: Record<string, number>, totalVotes: number): string | null {
    const majorityThreshold = totalVotes / 2;
    
    for (const [candidate, votes] of Object.entries(voteCounts)) {
      if (votes > majorityThreshold) {
        return candidate;
      }
    }
    
    return null;
  }

  // Run the ranked choice voting calculation
  calculateWinner(): RankedChoiceResult {
    let remainingCandidates = new Set(this.candidates);
    const rounds: RoundResult[] = [];
    const eliminationOrder: string[] = [];
    let roundNumber = 1;

    // Continue until we have a winner or only one candidate remains
    while (remainingCandidates.size > 1) {
      const voteCounts = this.countVotes(remainingCandidates);
      const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
      const majorityThreshold = totalVotes / 2;

      const roundResult: RoundResult = {
        round: roundNumber,
        voteCounts,
        totalVotes,
        majorityThreshold
      };

      // Check for majority winner
      const majorityWinner = this.checkForMajority(voteCounts, totalVotes);
      if (majorityWinner) {
        roundResult.winner = majorityWinner;
        rounds.push(roundResult);
        
        return {
          winner: majorityWinner,
          rounds,
          totalBallots: this.ballots.length,
          eliminationOrder
        };
      }

      // No majority winner, eliminate candidate with fewest votes
      const toEliminate = this.findCandidateToEliminate(voteCounts);
      roundResult.eliminated = toEliminate;
      rounds.push(roundResult);

      eliminationOrder.push(toEliminate);
      remainingCandidates.delete(toEliminate);
      roundNumber++;
    }

    // If only one candidate remains, they win
    const winner = remainingCandidates.size === 1 ? 
      Array.from(remainingCandidates)[0] : null;

    return {
      winner,
      rounds,
      totalBallots: this.ballots.length,
      eliminationOrder
    };
  }

  // Get detailed results with percentages
  getDetailedResults(): RankedChoiceResult & { 
    finalPercentages: Record<string, number>;
    participationRate: number;
  } {
    const basicResult = this.calculateWinner();
    const finalRound = basicResult.rounds[basicResult.rounds.length - 1];
    
    const finalPercentages: Record<string, number> = {};
    if (finalRound) {
      Object.entries(finalRound.voteCounts).forEach(([candidate, votes]) => {
        finalPercentages[candidate] = finalRound.totalVotes > 0 ? 
          Math.round((votes / finalRound.totalVotes) * 100) : 0;
      });
    }

    return {
      ...basicResult,
      finalPercentages,
      participationRate: this.ballots.length
    };
  }

  // Simulate what would happen if a candidate was eliminated early
  simulateEliminateCandidate(candidateToEliminate: string): RankedChoiceResult {
    const modifiedCandidates = Array.from(this.candidates).filter(c => c !== candidateToEliminate);
    const calculator = new RankedChoiceCalculator(modifiedCandidates, this.ballots);
    return calculator.calculateWinner();
  }
}

// Utility function to convert simple poll votes to ranked ballots
export function convertSimpleVotesToRanked(
  votes: { userId: string; optionId: string }[],
  allOptions: string[]
): RankedBallot[] {
  return votes.map(vote => ({
    userId: vote.userId,
    choices: [vote.optionId] // Simple vote becomes first choice
  }));
}

// Utility function to validate ranked choice preferences
export function validateRankedChoices(
  choices: string[],
  validOptions: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for duplicate choices
  const uniqueChoices = new Set(choices);
  if (uniqueChoices.size !== choices.length) {
    errors.push("Duplicate choices are not allowed");
  }
  
  // Check for invalid options
  const invalidChoices = choices.filter(choice => !validOptions.includes(choice));
  if (invalidChoices.length > 0) {
    errors.push(`Invalid options: ${invalidChoices.join(", ")}`);
  }
  
  // Check if choices array is empty
  if (choices.length === 0) {
    errors.push("At least one choice must be provided");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper to create ranked choice poll options for UI
export function createRankedChoiceOptions(candidates: string[]) {
  return candidates.map((candidate, index) => ({
    id: `option_${index + 1}`,
    text: candidate,
    votes: 0
  }));
}