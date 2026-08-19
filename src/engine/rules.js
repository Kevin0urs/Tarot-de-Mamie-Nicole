import { SUITS } from './types.js';

/**
 * Returns legal cards that a player can play given the current trick state and player's hand.
 * @param {Array} hand Array of Card objects in player's hand
 * @param {Array} currentTrick Array of { playerId, card } objects played in current trick
 * @returns {Array} Array of legal Card objects
 */
export function getLegalMoves(hand, currentTrick = []) {
  if (hand.length === 0) return [];
  
  // First card in trick: any card is legal
  if (currentTrick.length === 0) {
    return [...hand];
  }

  // Determine effective lead suit
  const leadSuitInfo = getLeadSuit(currentTrick);
  const leadSuit = leadSuitInfo ? leadSuitInfo.suit : null;

  // If Excuse led and no non-excuse card played yet: any card is legal
  if (!leadSuit) {
    return [...hand];
  }

  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  const trumpsInHand = hand.filter(c => c.suit === SUITS.TRUMP);
  const excuseInHand = hand.find(c => c.suit === SUITS.EXCUSE);

  // 1. If lead suit is NOT Trump
  if (leadSuit !== SUITS.TRUMP) {
    if (hasLeadSuit) {
      // Must follow suit! (Or play Excuse)
      const legal = hand.filter(c => c.suit === leadSuit || c.suit === SUITS.EXCUSE);
      return legal;
    }

    // Cannot follow suit -> Must Trump (couper) if has trumps
    if (trumpsInHand.length > 0) {
      const highestTrumpInTrick = getHighestTrumpValueInTrick(currentTrick);
      const higherTrumps = trumpsInHand.filter(c => c.value > highestTrumpInTrick);

      let legalTrumps = [];
      if (higherTrumps.length > 0) {
        // Must overtrump!
        legalTrumps = higherTrumps;
      } else {
        // Must undertrump (pisser)
        legalTrumps = trumpsInHand;
      }

      if (excuseInHand) {
        legalTrumps.push(excuseInHand);
      }
      return legalTrumps;
    }

    // Has no lead suit and no trumps -> Free discard (défausse)
    return [...hand];
  }

  // 2. If lead suit IS Trump
  if (trumpsInHand.length > 0) {
    const highestTrumpInTrick = getHighestTrumpValueInTrick(currentTrick);
    const higherTrumps = trumpsInHand.filter(c => c.value > highestTrumpInTrick);

    let legalTrumps = [];
    if (higherTrumps.length > 0) {
      // Must overtrump!
      legalTrumps = higherTrumps;
    } else {
      // Must undertrump
      legalTrumps = trumpsInHand;
    }

    if (excuseInHand) {
      legalTrumps.push(excuseInHand);
    }
    return legalTrumps;
  }

  // Lead suit is Trump, but player has NO trumps -> Free discard
  return [...hand];
}

/**
 * Determines the lead suit of the trick.
 * Handles the Excuse lead case (if Excuse is 1st, 2nd card determines suit).
 */
export function getLeadSuit(currentTrick) {
  if (!currentTrick || currentTrick.length === 0) return null;

  for (let play of currentTrick) {
    if (play.card.suit !== SUITS.EXCUSE) {
      return { suit: play.card.suit, card: play.card };
    }
  }

  // If only Excuse played so far, no effective lead suit yet
  return null;
}

/**
 * Returns the highest value of Trump currently in the trick (0 if no Trump played).
 */
export function getHighestTrumpValueInTrick(currentTrick) {
  let highest = 0;
  for (let play of currentTrick) {
    if (play.card.suit === SUITS.TRUMP && play.card.value > highest) {
      highest = play.card.value;
    }
  }
  return highest;
}

/**
 * Determines the winning played card object { playerId, card } of a completed trick (4 cards).
 * @param {Array} currentTrick Array of { playerId, card }
 * @param {boolean} isLastTrick True if this is trick 18
 */
export function getTrickWinner(currentTrick, isLastTrick = false) {
  if (currentTrick.length === 0) return null;

  // Filter out Excuse (unless last trick special case where Excuse is lost)
  const leadInfo = getLeadSuit(currentTrick);

  // If ALL 4 cards are Excuse (impossible in 4 player, but safety), first player wins
  if (!leadInfo) {
    return currentTrick[0];
  }

  const trumpsPlayed = currentTrick.filter(p => p.card.suit === SUITS.TRUMP);

  if (trumpsPlayed.length > 0) {
    // Highest Trump wins
    trumpsPlayed.sort((a, b) => b.card.value - a.card.value);
    return trumpsPlayed[0];
  }

  // No Trump played -> Highest card of the lead suit wins
  const suitPlayed = currentTrick.filter(p => p.card.suit === leadInfo.suit);
  suitPlayed.sort((a, b) => b.card.value - a.card.value);
  
  return suitPlayed[0];
}

/**
 * Validates whether putting a specific card into the Chien discard is allowed.
 * Rule: Preneur cannot discard Kings or Bouts.
 * Trumps can only be discarded if player has no other suit cards to discard.
 */
export function isValidChienDiscard(card, playerHand, currentDiscard) {
  // Bouts (Petit, 21, Excuse) can never be discarded
  if (card.isBout) return false;
  if (card.suit === SUITS.EXCUSE) return false;

  // Kings (value 14) cannot be discarded (non-trump Kings only)
  if (card.suit !== SUITS.TRUMP && card.value === 14) return false;

  // Trumps can only be discarded if player has no non-Trump, non-King suit cards remaining (excluding already selected discards)
  if (card.suit === SUITS.TRUMP) {
    const discardIds = new Set((currentDiscard || []).map(c => c.id));
    const availableNonTrump = playerHand.filter(c =>
      !discardIds.has(c.id) &&
      c.id !== card.id &&
      c.suit !== SUITS.TRUMP &&
      c.suit !== SUITS.EXCUSE &&
      c.value !== 14
    );
    if (availableNonTrump.length > 0) {
      return false; // Still has normal suit non-king cards to discard first
    }
  }

  return true;
}
