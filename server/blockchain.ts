import crypto from 'crypto';
import { storage } from './storage';
import type { ACPTransaction, ACPBlock } from '@shared/schema';

export class ACPBlockchain {
  private static instance: ACPBlockchain;
  private pendingTransactions: ACPTransaction[] = [];

  public static getInstance(): ACPBlockchain {
    if (!ACPBlockchain.instance) {
      ACPBlockchain.instance = new ACPBlockchain();
    }
    return ACPBlockchain.instance;
  }

  async addTransaction(transaction: ACPTransaction): Promise<void> {
    // Validate transaction
    if (!this.validateTransaction(transaction)) {
      throw new Error('Invalid transaction');
    }

    this.pendingTransactions.push(transaction);

    // Auto-mine block when we have enough transactions
    if (this.pendingTransactions.length >= 5) {
      await this.mineBlock();
    }
  }

  async mineBlock(): Promise<ACPBlock> {
    if (this.pendingTransactions.length === 0) {
      throw new Error('No pending transactions to mine');
    }

    const block = await storage.createBlockchainBlock(this.pendingTransactions);
    this.pendingTransactions = [];
    return block;
  }

  async verifyTransaction(transactionId: string): Promise<boolean> {
    const transaction = await storage.getTransactionHistory('', 1000);
    const tx = transaction.find(t => t.id === transactionId);
    
    if (!tx || !tx.blockchainHash) {
      return false;
    }

    // Verify transaction is in a valid block
    const block = await storage.getLatestBlock();
    if (!block || !block.transactionIds?.includes(transactionId)) {
      return false;
    }

    // Verify block integrity
    return this.verifyBlock(block);
  }

  async verifyBlock(block: ACPBlock): Promise<boolean> {
    // Recalculate hash
    const blockData = `${block.blockNumber}${block.previousHash}${block.merkleRoot}${block.timestamp?.toISOString()}${block.nonce}`;
    const calculatedHash = crypto.createHash('sha256').update(blockData).digest('hex');
    
    return calculatedHash === block.hash;
  }

  private validateTransaction(transaction: ACPTransaction): boolean {
    // Basic validation
    if (!transaction.amount || parseFloat(transaction.amount) <= 0) {
      return false;
    }

    if (transaction.transactionType === 'transfer' && !transaction.fromUserId) {
      return false;
    }

    return true;
  }

  async getBlockchainStats(): Promise<{
    totalBlocks: number;
    totalTransactions: number;
    latestBlock: ACPBlock | undefined;
    pendingTransactions: number;
  }> {
    const latestBlock = await storage.getLatestBlock();
    return {
      totalBlocks: latestBlock?.blockNumber || 0,
      totalTransactions: latestBlock?.transactionIds?.length || 0,
      latestBlock,
      pendingTransactions: this.pendingTransactions.length
    };
  }
}

export const blockchain = ACPBlockchain.getInstance();