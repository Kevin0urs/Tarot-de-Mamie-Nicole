import { CONTRACTS, isBout } from './types.js';

/**
 * Calculates final scores for a round of French Tarot.
 * 
 * @param {Object} params
 * @param {number} params.takerId Player ID of preneur (0..3)
 * @param {Object} params.contract Contract object from CONTRACTS
 * @param {Array} params.takerCards Array of Card objects won by preneur
 * @param {Array} params.defenseCards Array of Card objects won by defense
 * @param {Array} params.chienCards Array of 6 Card objects in Chien
 * @param {Object|null} params.petitAuBoutInfo Information about Petit au bout { winnerId: number, isPreneurWin: boolean }
 * @returns {Object} Score result breakdown
 */
export function calculateRoundScores({
  takerId,
  contract,
  takerCards = [],
  defenseCards = [],
  chienCards = [],
  petitAuBoutInfo = null
}) {
  let finalTakerCards = [...takerCards];
  let finalDefenseCards = [...defenseCards];

  // Distribute Chien:
  // Petite, Garde, Garde Sans -> Chien goes to Preneur
  // Garde Contre -> Chien goes to Defense
  if (contract.id === CONTRACTS.GARDE_CONTRE.id) {
    finalDefenseCards.push(...chienCards);
  } else {
    finalTakerCards.push(...chienCards);
  }

  // 1. Calculate points taken by preneur
  const preneurPoints = finalTakerCards.reduce((sum, card) => sum + card.points, 0);
  const defensePoints = finalDefenseCards.reduce((sum, card) => sum + card.points, 0);

  // 2. Count bouts taken by preneur
  const preneurBouts = finalTakerCards.filter(card => isBout(card)).length;

  // 3. Determine point target based on bouts
  let pointTarget = 56;
  if (preneurBouts === 3) pointTarget = 36;
  else if (preneurBouts === 2) pointTarget = 41;
  else if (preneurBouts === 1) pointTarget = 51;

  // 4. Difference
  const diff = preneurPoints - pointTarget;
  const isWon = diff >= 0;

  // Round difference (FFT standard rounds to nearest whole number if half-points)
  const absoluteDiff = Math.abs(diff);

  // 5. Petit au bout
  let petitAuBoutPoints = 0;
  if (petitAuBoutInfo) {
    if (petitAuBoutInfo.isPreneurWin) {
      // Preneur won the last trick with Petit
      petitAuBoutPoints = 10;
    } else {
      // Defense won the last trick containing Petit
      petitAuBoutPoints = -10;
    }
  }

  // 6. Calculate total base
  // Base = (25 + Math.abs(diff) + petitAuBout) * multiplier
  let baseScore = 25 + absoluteDiff;
  
  let preneurContractValue = 0;
  if (isWon) {
    preneurContractValue = (baseScore + petitAuBoutPoints) * contract.multiplier;
  } else {
    // Contract lost: base is negative, petit au bout adds or subtracts accordingly
    preneurContractValue = (-baseScore + petitAuBoutPoints) * contract.multiplier;
  }

  // 7. Player scores breakdown
  const playerScores = {};
  for (let id = 0; id < 4; id++) {
    if (id === takerId) {
      playerScores[id] = Math.round(preneurContractValue * 3);
    } else {
      playerScores[id] = Math.round(-preneurContractValue);
    }
  }

  return {
    takerId,
    contract,
    preneurPoints: Math.round(preneurPoints * 10) / 10,
    defensePoints: Math.round(defensePoints * 10) / 10,
    preneurBouts,
    pointTarget,
    diff: Math.round(diff * 10) / 10,
    isWon,
    petitAuBoutPoints,
    preneurContractValue,
    playerScores
  };
}
