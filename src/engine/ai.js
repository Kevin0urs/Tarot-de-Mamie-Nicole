import { SUITS, CONTRACTS, isBout } from './types.js';
import { isValidChienDiscard, getLeadSuit, getHighestTrumpValueInTrick } from './rules.js';

/**
 * AI Logic for French Tarot (3 AI opponents: Joueur 1, Joueur 2, Joueur 3)
 */
export class TarotAI {

  /**
   * Evaluates hand and chooses the best bid for an AI player.
   * @param {Array} hand Array of cards in AI player's hand
   * @param {Object} currentHighestBid Highest bid so far
   * @returns {Object} CONTRACTS object (PASSE, PETITE, GARDE, etc.)
   */
  static chooseBid(hand, currentHighestBid = CONTRACTS.PASSE) {
    const evalScore = this.evaluateHandForBidding(hand);

    let chosenContract = CONTRACTS.PASSE;

    if (evalScore >= 70) {
      chosenContract = CONTRACTS.GARDE;
    } else if (evalScore >= 48) {
      chosenContract = CONTRACTS.PETITE;
    } else {
      chosenContract = CONTRACTS.PASSE;
    }

    // Must be strictly higher than current highest bid
    if (chosenContract.priority <= currentHighestBid.priority) {
      return CONTRACTS.PASSE;
    }

    return chosenContract;
  }

  /**
   * Hand evaluation score calculation for French Tarot.
   */
  static evaluateHandForBidding(hand) {
    let score = 0;

    const trumps = hand.filter(c => c.suit === SUITS.TRUMP);
    const excuse = hand.find(c => c.suit === SUITS.EXCUSE);
    const bouts = hand.filter(c => isBout(c));

    // 1. Trumps quantity & quality
    score += trumps.length * 3.5;
    trumps.forEach(t => {
      if (t.value >= 18) score += 5;
      else if (t.value >= 12) score += 2.5;
    });

    // 2. Bouts
    score += bouts.length * 10;
    if (bouts.length === 3) score += 15; // All 3 bouts = huge advantage!

    // 3. High cards in suits
    const suitCounts = { [SUITS.SPADE]: 0, [SUITS.HEART]: 0, [SUITS.DIAMOND]: 0, [SUITS.CLUB]: 0 };

    hand.forEach(c => {
      if (suitCounts[c.suit] !== undefined) {
        suitCounts[c.suit]++;
        if (c.value === 14) score += 6;       // King
        else if (c.value === 13) score += 4;  // Queen
        else if (c.value === 12) score += 2;  // Knight
        else if (c.value === 11) score += 1;  // Jack
      }
    });

    // 4. Distribution (Voids and Singletons give trumping opportunities)
    Object.values(suitCounts).forEach(count => {
      if (count === 0) score += 6;      // Void (coupe franque)
      else if (count === 1) score += 3.5; // Singleton
    });

    return score;
  }

  /**
   * AI preneur chooses 6 cards to discard into the Chien.
   * @param {Array} fullHand 24 cards (18 hand + 6 chien)
   * @returns {Array} 6 discarded cards
   */
  static chooseChienDiscard(fullHand) {
    const discard = [];
    const hand = [...fullHand];

    // Count suit frequencies to target singletons/doubletons first
    const suitCounts = {
      [SUITS.SPADE]: hand.filter(c => c.suit === SUITS.SPADE).length,
      [SUITS.HEART]: hand.filter(c => c.suit === SUITS.HEART).length,
      [SUITS.DIAMOND]: hand.filter(c => c.suit === SUITS.DIAMOND).length,
      [SUITS.CLUB]: hand.filter(c => c.suit === SUITS.CLUB).length
    };

    // Sort suits by shortest count first (excluding suits with 0 cards)
    const sortedSuits = Object.keys(suitCounts)
      .filter(suit => suitCounts[suit] > 0)
      .sort((a, b) => suitCounts[a] - suitCounts[b]);

    // Priority 1: Discard cards from shortest non-king suit
    for (const suit of sortedSuits) {
      if (discard.length >= 6) break;

      const suitCards = hand
        .filter(c => c.suit === suit && !discard.includes(c))
        .sort((a, b) => a.value - b.value); // Discard lowest value first

      for (const card of suitCards) {
        if (discard.length >= 6) break;
        if (isValidChienDiscard(card, hand, discard)) {
          discard.push(card);
        }
      }
    }

    // Priority 2: Fill remaining discard with any non-king, non-bout suit cards
    if (discard.length < 6) {
      const remainingSuitCards = hand
        .filter(c => c.suit !== SUITS.TRUMP && c.suit !== SUITS.EXCUSE && !discard.includes(c))
        .sort((a, b) => a.value - b.value);

      for (const card of remainingSuitCards) {
        if (discard.length >= 6) break;
        if (isValidChienDiscard(card, hand, discard)) {
          discard.push(card);
        }
      }
    }

    // Priority 3: Discard non-bout trumps if strictly forced
    if (discard.length < 6) {
      const remainingTrumps = hand
        .filter(c => c.suit === SUITS.TRUMP && !c.isBout && !discard.includes(c))
        .sort((a, b) => a.value - b.value);

      for (const card of remainingTrumps) {
        if (discard.length >= 6) break;
        if (isValidChienDiscard(card, hand, discard)) {
          discard.push(card);
        }
      }
    }

    return discard;
  }

  /**
   * AI chooses the best card to play in the current trick.
   * @param {Object} context 
   * @returns {Object} Selected Card object
   */
  static choosePlayCard({
    playerId,
    hand,
    legalMoves,
    currentTrick,
    takerId,
    tricksHistory = []
  }) {
    if (!legalMoves || legalMoves.length === 0) return null;
    if (legalMoves.length === 1) return legalMoves[0];

    const isPreneur = (playerId === takerId);
    const positionInTrick = currentTrick.length; // 0, 1, 2, 3

    // 1. First to lead (Position 0)
    if (positionInTrick === 0) {
      if (isPreneur) {
        // Preneur lead: If holding strong trumps, lead high trump to pull defense trumps
        const trumps = legalMoves.filter(c => c.suit === SUITS.TRUMP);
        const highTrump = trumps.find(c => c.value >= 15);
        if (highTrump && trumps.length >= 5) {
          return highTrump;
        }

        // Otherwise lead a King or a long suit winner
        const king = legalMoves.find(c => c.value === 14 && c.suit !== SUITS.TRUMP);
        if (king) return king;

        // Otherwise lead lowest card of a suit
        const suitCards = legalMoves.filter(c => c.suit !== SUITS.TRUMP && c.suit !== SUITS.EXCUSE);
        if (suitCards.length > 0) {
          return suitCards.sort((a, b) => a.value - b.value)[0];
        }
        return legalMoves[0];
      } else {
        // Defense lead: Lead King if held
        const king = legalMoves.find(c => c.value === 14 && c.suit !== SUITS.TRUMP);
        if (king) return king;

        // Lead a non-trump suit card
        const suitCards = legalMoves.filter(c => c.suit !== SUITS.TRUMP && c.suit !== SUITS.EXCUSE);
        if (suitCards.length > 0) {
          return suitCards.sort((a, b) => b.value - a.value)[0];
        }
        return legalMoves[0];
      }
    }

    // 2. Positions 1, 2, 3
    const leadInfo = getLeadSuit(currentTrick);
    const leadSuit = leadInfo ? leadInfo.suit : null;

    // Determine who is currently winning the trick
    const currentWinningPlay = this.getWinningPlaySoFar(currentTrick);
    const isPartnerWinning = currentWinningPlay ? (
      isPreneur ? (currentWinningPlay.playerId === takerId) : (currentWinningPlay.playerId !== takerId)
    ) : false;

    // A. Partner is winning the trick
    if (isPartnerWinning) {
      // Don't waste a bout or high card if partner already has it won
      const safeMoves = legalMoves.filter(c => !c.isBout);
      const candidates = safeMoves.length > 0 ? safeMoves : legalMoves;

      // Provide highest points (King/Queen) if safe to give points to partner
      const highPointCard = candidates.sort((a, b) => b.points - a.points)[0];
      if (highPointCard && highPointCard.points > 0.5) {
        return highPointCard;
      }
      // Play lowest card
      return candidates.sort((a, b) => a.value - b.value)[0];
    }

    // B. Opponent is winning the trick
    // Try to win the trick cheaply if possible
    const winningMoves = legalMoves.filter(card => {
      const simulatedTrick = [...currentTrick, { playerId, card }];
      const winner = this.getWinningPlaySoFar(simulatedTrick);
      return winner && winner.playerId === playerId;
    });

    if (winningMoves.length > 0) {
      // Filter out bouts if not last position unless necessary
      const nonBoutWinning = winningMoves.filter(c => !c.isBout);
      const chosenMoves = nonBoutWinning.length > 0 ? nonBoutWinning : winningMoves;
      // Win with lowest winning card
      return chosenMoves.sort((a, b) => a.value - b.value)[0];
    }

    // C. Cannot win the trick -> Play lowest value card or save bout with Excuse
    const excuse = legalMoves.find(c => c.suit === SUITS.EXCUSE);
    if (excuse && currentTrick.some(p => p.card.points >= 3.5)) {
      return excuse; // Save points by playing Excuse
    }

    // Play lowest value card
    const nonBouts = legalMoves.filter(c => !c.isBout);
    const fallback = nonBouts.length > 0 ? nonBouts : legalMoves;
    return fallback.sort((a, b) => a.value - b.value)[0];
  }

  static getWinningPlaySoFar(currentTrick) {
    if (!currentTrick || currentTrick.length === 0) return null;
    const leadInfo = getLeadSuit(currentTrick);
    if (!leadInfo) return currentTrick[0];

    const trumps = currentTrick.filter(p => p.card.suit === SUITS.TRUMP);
    if (trumps.length > 0) {
      return trumps.sort((a, b) => b.card.value - a.card.value)[0];
    }

    const suitPlays = currentTrick.filter(p => p.card.suit === leadInfo.suit);
    if (suitPlays.length > 0) {
      return suitPlays.sort((a, b) => b.card.value - a.card.value)[0];
    }

    return currentTrick[0];
  }
}
