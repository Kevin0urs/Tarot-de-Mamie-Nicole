import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRoundScores } from '../src/engine/scoring.js';
import { CONTRACTS } from '../src/engine/types.js';

test('calculateRoundScores with 2 bouts and 45 points won on Petite', () => {
  // Target for 2 bouts is 41 points
  // Points won = 45 -> diff = +4
  // Base score = (25 + 4) * 1 = 29
  // Preneur score = +29 * 3 = +87
  // Each defender = -29
  const takerCards = [
    { id: 'trump_21', points: 4.5, isBout: true },
    { id: 'trump_1', points: 4.5, isBout: true }
  ];
  // Pad with dummy points up to 45 pts
  for (let i = 0; i < 36; i++) {
    takerCards.push({ id: `dummy_${i}`, points: 1.0, isBout: false });
  }

  const result = calculateRoundScores({
    takerId: 0,
    contract: CONTRACTS.PETITE,
    takerCards,
    defenseCards: [],
    chienCards: []
  });

  assert.equal(result.isWon, true);
  assert.equal(result.pointTarget, 41);
  assert.equal(result.preneurPoints, 45);
  assert.equal(result.diff, 4);
  assert.equal(result.playerScores[0], 87);
  assert.equal(result.playerScores[1], -29);
  assert.equal(result.playerScores[2], -29);
  assert.equal(result.playerScores[3], -29);
});

test('calculateRoundScores with Garde contract multiplier x2', () => {
  const takerCards = [
    { id: 'trump_21', points: 4.5, isBout: true },
    { id: 'trump_1', points: 4.5, isBout: true },
    { id: 'excuse', points: 4.5, isBout: true }
  ];
  // 3 bouts -> Target is 36 points. Points = 36 -> diff = 0
  // Base = (25 + 0) * 2 = 50
  // Preneur score = 50 * 3 = 150
  for (let i = 0; i < 22.5; i++) {
    takerCards.push({ id: `dummy_${i}`, points: 1.0, isBout: false });
  }

  const result = calculateRoundScores({
    takerId: 1,
    contract: CONTRACTS.GARDE,
    takerCards,
    defenseCards: [],
    chienCards: []
  });

  assert.equal(result.isWon, true);
  assert.equal(result.pointTarget, 36);
  assert.equal(result.playerScores[1], 150);
  assert.equal(result.playerScores[0], -50);
});
