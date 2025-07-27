import { createHash } from 'crypto';

export interface VoteRecord {
  pollId: string;
  userId: string;
  vote: string | string[]; // string for simple, array for ranked choice
  timestamp: number;
  blockHash?: string;
  previousHash?: string;
}

export interface BlockchainBlock {
  index: number;
  timestamp: number;
  votes: VoteRecord[];
  previousHash: string;
  hash: string;
  merkleRoot: string;
}

class BlockchainService {
  private chain: BlockchainBlock[] = [];

  constructor() {
    // Create genesis block
    this.chain.push(this.createGenesisBlock());
  }

  private createGenesisBlock(): BlockchainBlock {
    const block: BlockchainBlock = {
      index: 0,
      timestamp: Date.now(),
      votes: [],
      previousHash: "0",
      hash: "",
      merkleRoot: ""
    };
    
    block.merkleRoot = this.calculateMerkleRoot(block.votes);
    block.hash = this.calculateHash(block);
    return block;
  }

  private calculateHash(block: BlockchainBlock): string {
    const data = block.index + block.timestamp + block.previousHash + block.merkleRoot + JSON.stringify(block.votes);
    return createHash('sha256').update(data).digest('hex');
  }

  private calculateMerkleRoot(votes: VoteRecord[]): string {
    if (votes.length === 0) return createHash('sha256').update('').digest('hex');
    
    let hashes = votes.map(vote => 
      createHash('sha256').update(JSON.stringify(vote)).digest('hex')
    );

    while (hashes.length > 1) {
      const newHashes: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = i + 1 < hashes.length ? hashes[i + 1] : left;
        const combined = createHash('sha256').update(left + right).digest('hex');
        newHashes.push(combined);
      }
      hashes = newHashes;
    }

    return hashes[0];
  }

  public addVote(voteRecord: VoteRecord): string {
    const latestBlock = this.getLatestBlock();
    
    // Add vote to a new block
    const newBlock: BlockchainBlock = {
      index: latestBlock.index + 1,
      timestamp: Date.now(),
      votes: [voteRecord],
      previousHash: latestBlock.hash,
      hash: "",
      merkleRoot: ""
    };

    newBlock.merkleRoot = this.calculateMerkleRoot(newBlock.votes);
    newBlock.hash = this.calculateHash(newBlock);

    // Update vote record with block hash
    voteRecord.blockHash = newBlock.hash;
    voteRecord.previousHash = latestBlock.hash;

    this.chain.push(newBlock);
    return newBlock.hash;
  }

  public getLatestBlock(): BlockchainBlock {
    return this.chain[this.chain.length - 1];
  }

  public verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify current block hash
      if (currentBlock.hash !== this.calculateHash(currentBlock)) {
        return false;
      }

      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Verify merkle root
      if (currentBlock.merkleRoot !== this.calculateMerkleRoot(currentBlock.votes)) {
        return false;
      }
    }
    return true;
  }

  public getVoteVerification(voteHash: string): any {
    for (const block of this.chain) {
      const vote = block.votes.find(v => v.blockHash === voteHash);
      if (vote) {
        return {
          vote,
          block: {
            index: block.index,
            hash: block.hash,
            timestamp: block.timestamp,
            previousHash: block.previousHash,
            merkleRoot: block.merkleRoot
          },
          verified: this.verifyChain()
        };
      }
    }
    return null;
  }

  public getChainSummary() {
    return {
      totalBlocks: this.chain.length,
      totalVotes: this.chain.reduce((sum, block) => sum + block.votes.length, 0),
      isValid: this.verifyChain(),
      latestBlockHash: this.getLatestBlock().hash,
      chainHeight: this.chain.length - 1
    };
  }

  public getPollVotes(pollId: string): VoteRecord[] {
    const votes: VoteRecord[] = [];
    for (const block of this.chain) {
      votes.push(...block.votes.filter(vote => vote.pollId === pollId));
    }
    return votes;
  }
}

export const blockchain = new BlockchainService();