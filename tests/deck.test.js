import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffleDeck, dealCards, sortHand } from '../src/engine/deck.js';
import { SUITS } from '../src/engine/types.js';

test('createDeck creates 78 cards with exactly 91 total points', () => {
  const deck = createDeck();
  assert.equal(deck.length, 78);

  const bouts = deck.filter(c => c.isBout);
  assert.equal(bouts.length, 3); // 1, 21, Excuse

  const totalPoints = deck.reduce((sum, c) => sum + c.points, 0);
  assert.equal(totalPoints, 91);
});

test('dealCards distributes 18 cards to 4 players and 6 cards to Chien', () => {
  const deck = shuffleDeck(createDeck());
  const { hands, chien } = dealCards(deck, 0);

  assert.equal(hands.length, 4);
  hands.forEach((hand, idx) => {
    assert.equal(hand.length, 18, `Player ${idx} hand must have 18 cards`);
  });

  assert.equal(chien.length, 6, 'Chien must have 6 cards');

  // Verify all 78 unique cards are accounted for
  const allCardIds = new Set();
  hands.forEach(h => h.forEach(c => allCardIds.add(c.id)));
  chien.forEach(c => allCardIds.add(c.id));

  assert.equal(allCardIds.size, 78);
});
