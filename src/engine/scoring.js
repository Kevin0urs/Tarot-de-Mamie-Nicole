import { CONTRACTS, isBout } from './types.js';

/**
 * Calculates final scores for a round of 4-player French Tarot (FFT Rules).
 * 
 * Target Points by Bouts:
 * 0 Bouts: 56 pts
 * 1 Bout: 51 pts
 * 2 Bouts: 41 pts
 * 3 Bouts: 36 pts
 * 
 * Contract Multipliers:
 * Petite: x1
 * Garde: x2
 * Garde Sans: x4
 * Garde Contre: x6
 * 
 * Base Unit Score = (25 + |écart| + PetitAuBout) * Multiplier
 * 
 * Distribution:
 * Preneur: +/- 3 * Score Unitaire (+/- Poignée/Chelem bonuses)
 * Defenders: -/+ 1 * Score Unitaire (-/+ Poignée/Chelem bonuses)
 * 
 * Total sum for each round is ALWAYS 0.
 * 
 * @param {Object} params
 * @param {number} params.takerId Player ID of preneur (0..3)
 * @param {Object} params.contract Contract object from CONTRACTS
 * @param {Array} params.takerCards Array of Card objects won by preneur
 * @param {Array} params.defenseCards Array of Card objects won by defense
 * @param {Array} params.chienCards Array of 6 Card objects in Chien
 * @param {Object|null} params.petitAuBoutInfo Information about Petit au bout { winnerId: number, isPreneurWin: boolean }
 * @param {Object|null} params.poigneeInfo Information about Poignée { declaredBy: 'preneur'|'defense', type: 'simple'|'double'|'triple' }
 * @param {Object|null} params.chelemInfo Information about Chelem { announced: boolean, realized: boolean, byPreneur: boolean }
 * @returns {Object} Score result breakdown
 */
export function calculateRoundScores({
  takerId,
  contract,
  takerCards = [],
  defenseCards = [],
  chienCards = [],
  petitAuBoutInfo = null,
  poigneeInfo = null,
  chelemInfo = null
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

  // 1. Calculate points taken by preneur (Cards: Bout=4.5, Roi=4.5, Dame=3.5, Cavalier=2.5, Valet=1.5, Petites=0.5)
  const preneurPoints = finalTakerCards.reduce((sum, card) => sum + (card.points || 0.5), 0);
  const defensePoints = finalDefenseCards.reduce((sum, card) => sum + (card.points || 0.5), 0);

  // 2. Count bouts taken by preneur (1 of Trump, 21 of Trump, Excuse)
  const preneurBouts = finalTakerCards.filter(card => isBout(card)).length;

  // 3. Determine point target based on bouts:
  // 0 Bouts: 56, 1 Bout: 51, 2 Bouts: 41, 3 Bouts: 36
  let pointTarget = 56;
  if (preneurBouts === 3) pointTarget = 36;
  else if (preneurBouts === 2) pointTarget = 41;
  else if (preneurBouts === 1) pointTarget = 51;

  // 4. Écart (Difference)
  const diff = preneurPoints - pointTarget;
  const isWon = diff >= 0;
  const absoluteDiff = Math.abs(diff);

  // 5. Petit au bout (+10 * multiplier for the side winning last trick with Petit)
  let petitAuBoutVal = 0;
  if (petitAuBoutInfo) {
    if (petitAuBoutInfo.isPreneurWin) {
      petitAuBoutVal = 10;
    } else {
      petitAuBoutVal = -10;
    }
  }

  // 6. Base Score Unitaire = (25 + |écart| + PetitAuBout) * Multiplier
  let baseContractScore = 25 + absoluteDiff;
  let unitScore = 0;

  if (isWon) {
    unitScore = (baseContractScore + petitAuBoutVal) * contract.multiplier;
  } else {
    // Contract lost: base is negative, petit au bout is added or subtracted accordingly
    unitScore = (-baseContractScore + petitAuBoutVal) * contract.multiplier;
  }

  // 7. Poignée Bonus (Not multiplied by contract multiplier)
  // Simple = 20, Double = 30, Triple = 40
  // The side that WINS the contract collects the Poignée bonus (regardless of who declared it)
  let poigneeBonus = 0;
  if (poigneeInfo) {
    let value = 20;
    if (poigneeInfo.type === 'double') value = 30;
    if (poigneeInfo.type === 'triple') value = 40;

    // If contract won, preneur gains poignee bonus; if contract lost, defense gains it
    if (isWon) {
      poigneeBonus = value;
    } else {
      poigneeBonus = -value;
    }
  }

  // 8. Chelem Bonus (Not multiplied by contract multiplier)
  // Announced & Realized = +400, Non-announced & Realized = +200, Announced & Failed = -200
  let chelemBonus = 0;
  if (chelemInfo) {
    if (chelemInfo.realized) {
      chelemBonus = chelemInfo.announced ? 400 : 200;
    } else if (chelemInfo.announced) {
      chelemBonus = -200;
    }
    if (!chelemInfo.byPreneur) {
      chelemBonus = -chelemBonus;
    }
  }

  // 9. Total Unit Score per Defender
  const netUnitScore = unitScore + poigneeBonus + chelemBonus;

  // 10. Player Scores Breakdown (Sum = 0)
  // Preneur receives +/- 3 * netUnitScore
  // Each defender pays/receives -/+ 1 * netUnitScore
  const playerScores = {};
  for (let id = 0; id < 4; id++) {
    if (id === takerId) {
      playerScores[id] = Math.round(netUnitScore * 3);
    } else {
      playerScores[id] = Math.round(-netUnitScore);
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
    petitAuBoutPoints: petitAuBoutVal,
    unitScore: netUnitScore,
    playerScores
  };
}
