import { CONTRACTS } from './types.js';

/**
 * Bidding state manager for French Tarot
 */
export class BiddingEngine {
  constructor(firstPlayerId = 0) {
    this.firstPlayerId = firstPlayerId;
    this.currentPlayerId = firstPlayerId;
    this.bids = []; // { playerId, contract }
    this.highestBid = CONTRACTS.PASSE;
    this.takerId = null; // Preneur
    this.isComplete = false;
  }

  /**
   * Returns list of valid contracts for current player.
   */
  getValidContracts() {
    if (this.isComplete) return [];

    const valid = [CONTRACTS.PASSE];
    const currentMaxPriority = this.highestBid.priority;

    Object.values(CONTRACTS).forEach(contract => {
      if (contract.priority > currentMaxPriority) {
        valid.push(contract);
      }
    });

    return valid;
  }

  /**
   * Player places a bid.
   * @param {number} playerId 
   * @param {Object} contract 
   */
  placeBid(playerId, contract) {
    if (this.isComplete) {
      throw new Error('Bidding phase is already complete.');
    }
    if (playerId !== this.currentPlayerId) {
      throw new Error(`It is player ${this.currentPlayerId}'s turn to bid, not ${playerId}.`);
    }

    const validContracts = this.getValidContracts();
    if (!validContracts.some(c => c.id === contract.id)) {
      throw new Error(`Invalid bid "${contract.name}". Must be higher than current contract "${this.highestBid.name}".`);
    }

    this.bids.push({ playerId, contract });

    if (contract.priority > this.highestBid.priority) {
      this.highestBid = contract;
      this.takerId = playerId;
    }

    // Move to next player
    if (this.bids.length < 4) {
      this.currentPlayerId = (this.currentPlayerId + 1) % 4;
    } else {
      this.isComplete = true;
    }

    return {
      bid: contract,
      highestBid: this.highestBid,
      takerId: this.takerId,
      isComplete: this.isComplete
    };
  }
}
