import { createHash } from "crypto";

// Simple blockchain-like transparency system for vote verification
// In production, this would integrate with actual blockchain networks

export interface VoteRecord {
  id: string;
  pollId: string;
  userId: string;
  optionId?: string;
  rankedChoices?: string[];
  timestamp: number;
}

export interface BlockchainRecord {
  blockId: string;
  previousHash: string;
  timestamp: number;
  votes: VoteRecord[];
  merkleRoot: string;
  hash: string;
}

class BlockchainVerifier {
  private blocks: BlockchainRecord[] = [];
  private readonly genesisHash = "0000000000000000000000000000000000000000000000000000000000000000";

  // Create a hash for a vote record
  createVoteHash(vote: VoteRecord): string {
    const voteString = JSON.stringify({
      id: vote.id,
      pollId: vote.pollId,
      userId: this.anonymizeUserId(vote.userId), // Anonymize for privacy
      optionId: vote.optionId,
      rankedChoices: vote.rankedChoices,
      timestamp: vote.timestamp
    });
    
    return createHash('sha256').update(voteString).digest('hex');
  }

  // Create merkle root from vote hashes
  private createMerkleRoot(votes: VoteRecord[]): string {
    if (votes.length === 0) return "";
    
    const hashes = votes.map(vote => this.createVoteHash(vote));
    
    // Build merkle tree bottom-up
    let currentLevel = hashes;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);
      }
      
      currentLevel = nextLevel;
    }
    
    return currentLevel[0];
  }

  // Create block hash
  private createBlockHash(block: Omit<BlockchainRecord, 'hash'>): string {
    const blockString = JSON.stringify({
      blockId: block.blockId,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      merkleRoot: block.merkleRoot,
      voteCount: block.votes.length
    });
    
    return createHash('sha256').update(blockString).digest('hex');
  }

  // Add votes to blockchain
  addVoteBlock(votes: VoteRecord[]): string {
    const previousHash = this.blocks.length > 0 
      ? this.blocks[this.blocks.length - 1].hash 
      : this.genesisHash;
    
    const merkleRoot = this.createMerkleRoot(votes);
    const blockId = `block_${this.blocks.length + 1}_${Date.now()}`;
    
    const block: Omit<BlockchainRecord, 'hash'> = {
      blockId,
      previousHash,
      timestamp: Date.now(),
      votes,
      merkleRoot
    };
    
    const hash = this.createBlockHash(block);
    
    const finalBlock: BlockchainRecord = {
      ...block,
      hash
    };
    
    this.blocks.push(finalBlock);
    return hash;
  }

  // Verify a specific vote exists in the blockchain
  verifyVote(voteId: string): { verified: boolean; block?: BlockchainRecord; voteHash?: string } {
    for (const block of this.blocks) {
      const vote = block.votes.find(v => v.id === voteId);
      if (vote) {
        const voteHash = this.createVoteHash(vote);
        return {
          verified: true,
          block,
          voteHash
        };
      }
    }
    
    return { verified: false };
  }

  // Verify blockchain integrity
  verifyChain(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      const expectedPreviousHash = i === 0 ? this.genesisHash : this.blocks[i - 1].hash;
      
      if (block.previousHash !== expectedPreviousHash) {
        errors.push(`Block ${i} has invalid previous hash`);
      }
      
      const recalculatedHash = this.createBlockHash({
        blockId: block.blockId,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        votes: block.votes,
        merkleRoot: block.merkleRoot
      });
      
      if (block.hash !== recalculatedHash) {
        errors.push(`Block ${i} has invalid hash`);
      }
      
      const recalculatedMerkleRoot = this.createMerkleRoot(block.votes);
      if (block.merkleRoot !== recalculatedMerkleRoot) {
        errors.push(`Block ${i} has invalid merkle root`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Anonymize user ID for privacy while maintaining verifiability
  private anonymizeUserId(userId: string): string {
    return createHash('sha256').update(userId + "salt_for_anonymization").digest('hex').substring(0, 16);
  }

  // Get blockchain summary for transparency
  getBlockchainSummary() {
    return {
      totalBlocks: this.blocks.length,
      totalVotes: this.blocks.reduce((sum, block) => sum + block.votes.length, 0),
      lastBlockHash: this.blocks.length > 0 ? this.blocks[this.blocks.length - 1].hash : null,
      chainVerification: this.verifyChain()
    };
  }

  // Export blockchain data for transparency
  exportBlockchain() {
    return {
      blocks: this.blocks.map(block => ({
        blockId: block.blockId,
        timestamp: new Date(block.timestamp).toISOString(),
        voteCount: block.votes.length,
        hash: block.hash,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot
      })),
      summary: this.getBlockchainSummary()
    };
  }
}

// Singleton instance for the application
export const blockchainVerifier = new BlockchainVerifier();

// Utility functions for vote verification
export function generateVoteProof(vote: VoteRecord): string {
  return blockchainVerifier.createVoteHash(vote);
}

export function verifyVoteIntegrity(voteId: string) {
  return blockchainVerifier.verifyVote(voteId);
}