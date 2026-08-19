import test from 'node:test';
import assert from 'node:assert/strict';
import { getLegalMoves, getTrickWinner, isValidChienDiscard } from '../src/engine/rules.js';
import { SUITS } from '../src/engine/types.js';

test('getLegalMoves forces following suit if available', () => {
  const hand = [
    { id: 'spade_10', suit: SUITS.SPADE, value: 10, points: 0.5 },
    { id: 'heart_5', suit: SUITS.HEART, value: 5, points: 0.5 },
    { id: 'trump_12', suit: SUITS.TRUMP, value: 12, points: 0.5 }
  ];

  const currentTrick = [
    { playerId: 0, card: { id: 'spade_14', suit: SUITS.SPADE, value: 14, points: 4.5 } }
  ];

  const legal = getLegalMoves(hand, currentTrick);
  assert.equal(legal.length, 1);
  assert.equal(legal[0].id, 'spade_10');
});

test('getLegalMoves forces trumping and overtrumping when lacking lead suit', () => {
  const hand = [
    { id: 'heart_5', suit: SUITS.HEART, value: 5, points: 0.5 },
    { id: 'trump_5', suit: SUITS.TRUMP, value: 5, points: 0.5 },
    { id: 'trump_15', suit: SUITS.TRUMP, value: 15, points: 0.5 }
  ];

  const currentTrick = [
    { playerId: 0, card: { id: 'spade_14', suit: SUITS.SPADE, value: 14, points: 4.5 } },
    { playerId: 1, card: { id: 'trump_10', suit: SUITS.TRUMP, value: 10, points: 0.5 } }
  ];

  const legal = getLegalMoves(hand, currentTrick);
  // Must overtrump (trump_15)
  assert.equal(legal.length, 1);
  assert.equal(legal[0].id, 'trump_15');
});

test('getTrickWinner picks highest trump over suit cards', () => {
  const trick = [
    { playerId: 0, card: { id: 'spade_14', suit: SUITS.SPADE, value: 14, points: 4.5 } },
    { playerId: 1, card: { id: 'trump_5', suit: SUITS.TRUMP, value: 5, points: 0.5 } },
    { playerId: 2, card: { id: 'trump_18', suit: SUITS.TRUMP, value: 18, points: 0.5 } },
    { playerId: 3, card: { id: 'spade_1', suit: SUITS.SPADE, value: 1, points: 0.5 } }
  ];

  const winner = getTrickWinner(trick);
  assert.equal(winner.playerId, 2);
  assert.equal(winner.card.id, 'trump_18');
});

test('isValidChienDiscard rejects Kings and Bouts', () => {
  const king = { id: 'spade_14', suit: SUITS.SPADE, value: 14, isBout: false };
  const bout = { id: 'trump_21', suit: SUITS.TRUMP, value: 21, isBout: true };
  const normalCard = { id: 'spade_5', suit: SUITS.SPADE, value: 5, isBout: false };

  assert.equal(isValidChienDiscard(king, [], []), false);
  assert.equal(isValidChienDiscard(bout, [], []), false);
  assert.equal(isValidChienDiscard(normalCard, [normalCard], []), true);
});
