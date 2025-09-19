// Feed system configuration
export const FEED_CONFIG = {
  all: {
    decayHours: 18,
    weights: { 
      like: 1, 
      comment: 3, 
      share: 4, 
      emoji: 1, // Scaled from 0.5 * 2 to avoid decimal casting issues
      gif: 3, // Scaled from 1.5 * 2 to avoid decimal casting issues 
      bookmark: 4, 
      flagPenalty: { confirmed: 6, unreviewed: 1 } 
    },
    authorRepeatWindow: 8
  },
  news: {
    minVotesForConfidence: 20,
    decayHours: 24,
    monetizeThreshold: 0.50,
    demonetizeBiasAbs: 0.60,
    demonetizeNeutralityBelow: 0.35
  },
  voting: { 
    minAccountAgeDays: 7 
  }
} as const;

// Bias vote types
export const BIAS_VOTE_TYPES = {
  NEUTRAL: 'Neutral',
  LEFT_BIAS: 'LeftBias', 
  RIGHT_BIAS: 'RightBias'
} as const;

// Reaction types (excluding likes/comments to avoid duplication with existing tables)
export const REACTION_TYPES = {
  EMOJI: 'emoji',
  GIF: 'gif', 
  SHARE: 'share',
  BOOKMARK: 'bookmark'
} as const;

// Post types 
export const POST_TYPES = {
  POST: 'post',
  NEWS: 'news',
  ANNOUNCEMENT: 'announcement',
  CHARITY_DONATION: 'charity_donation',
  POLL: 'poll'
} as const;