export interface RankedVote {
  userId: string;
  rankedChoices: string[]; // Array of option IDs in preference order
}

export interface RoundResult {
  round: number;
  voteCounts: { [optionId: string]: number };
  totalVotes: number;
  majorityThreshold: number;
  winner?: string;
  eliminated?: string;
}

export interface RankedChoiceResult {
  winner: string | null;
  rounds: RoundResult[];
  eliminationOrder: string[];
}

export function calculateRankedChoiceWinner(
  votes: RankedVote[],
  options: { id: string; text: string }[]
): RankedChoiceResult {
  if (votes.length === 0) {
    return {
      winner: null,
      rounds: [],
      eliminationOrder: []
    };
  }

  const activeOptions = new Set(options.map(opt => opt.id));
  const eliminationOrder: string[] = [];
  const rounds: RoundResult[] = [];
  let roundNumber = 1;

  while (activeOptions.size > 1) {
    // Count first-choice votes for active options
    const voteCounts: { [optionId: string]: number } = {};
    
    // Initialize counts
    activeOptions.forEach(optionId => {
      voteCounts[optionId] = 0;
    });

    // Count votes
    for (const vote of votes) {
      // Find the first active choice in this vote
      const firstActiveChoice = vote.rankedChoices.find(choice => 
        activeOptions.has(choice)
      );
      
      if (firstActiveChoice) {
        voteCounts[firstActiveChoice]++;
      }
    }

    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    const majorityThreshold = Math.floor(totalVotes / 2) + 1;

    // Check for majority winner
    const winner = Object.entries(voteCounts).find(([_, count]) => 
      count >= majorityThreshold
    );

    const roundResult: RoundResult = {
      round: roundNumber,
      voteCounts,
      totalVotes,
      majorityThreshold,
    };

    if (winner) {
      roundResult.winner = winner[0];
      rounds.push(roundResult);
      
      return {
        winner: winner[0],
        rounds,
        eliminationOrder
      };
    }

    // No majority winner, eliminate the candidate with the fewest votes
    let minVotes = Infinity;
    let candidateToEliminate = '';
    
    for (const [optionId, count] of Object.entries(voteCounts)) {
      if (count < minVotes) {
        minVotes = count;
        candidateToEliminate = optionId;
      } else if (count === minVotes && candidateToEliminate) {
        // Tie-breaking: eliminate the one that was added later (by ID comparison)
        if (optionId > candidateToEliminate) {
          candidateToEliminate = optionId;
        }
      }
    }

    roundResult.eliminated = candidateToEliminate;
    rounds.push(roundResult);

    activeOptions.delete(candidateToEliminate);
    eliminationOrder.push(candidateToEliminate);
    roundNumber++;
  }

  // If we're down to one candidate, they win
  const finalWinner = activeOptions.size === 1 ? Array.from(activeOptions)[0] : null;

  return {
    winner: finalWinner,
    rounds,
    eliminationOrder
  };
}

export function validateRankedVote(
  rankedChoices: string[],
  validOptionIds: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if all choices are valid option IDs
  for (const choice of rankedChoices) {
    if (!validOptionIds.includes(choice)) {
      errors.push(`Invalid option ID: ${choice}`);
    }
  }

  // Check for duplicates
  const uniqueChoices = new Set(rankedChoices);
  if (uniqueChoices.size !== rankedChoices.length) {
    errors.push('Duplicate choices are not allowed');
  }

  // Check if at least one choice is provided
  if (rankedChoices.length === 0) {
    errors.push('At least one choice must be provided');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function simulateRankedChoiceElection(
  votes: RankedVote[],
  options: { id: string; text: string }[]
) {
  const result = calculateRankedChoiceWinner(votes, options);
  
  return {
    ...result,
    summary: {
      totalVotes: votes.length,
      totalRounds: result.rounds.length,
      finalWinnerName: result.winner ? 
        options.find(opt => opt.id === result.winner)?.text : null,
      eliminatedCandidates: result.eliminationOrder.map(id => 
        options.find(opt => opt.id === id)?.text
      ).filter(Boolean)
    }
  };
}