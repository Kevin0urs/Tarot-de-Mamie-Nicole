import test from 'node:test';
import assert from 'node:assert/strict';
import { TarotAI } from '../src/engine/ai.js';
import { CONTRACTS, SUITS } from '../src/engine/types.js';

test('TarotAI.chooseBid bids Garde on very strong hand', () => {
  const strongHand = [
    { id: 'excuse', suit: SUITS.EXCUSE, value: 0, isBout: true },
    { id: 'trump_21', suit: SUITS.TRUMP, value: 21, isBout: true },
    { id: 'trump_1', suit: SUITS.TRUMP, value: 1, isBout: true },
    { id: 'trump_20', suit: SUITS.TRUMP, value: 20 },
    { id: 'trump_19', suit: SUITS.TRUMP, value: 19 },
    { id: 'trump_18', suit: SUITS.TRUMP, value: 18 },
    { id: 'trump_17', suit: SUITS.TRUMP, value: 17 },
    { id: 'trump_16', suit: SUITS.TRUMP, value: 16 },
    { id: 'spade_14', suit: SUITS.SPADE, value: 14 },
    { id: 'heart_14', suit: SUITS.HEART, value: 14 },
    { id: 'club_14', suit: SUITS.CLUB, value: 14 }
  ];

  const bid = TarotAI.chooseBid(strongHand);
  assert.equal(bid.priority >= CONTRACTS.PETITE.priority, true);
});

test('TarotAI.chooseChienDiscard selects valid 6 cards without Kings or Bouts', () => {
  const fullHand = [
    { id: 'spade_14', suit: SUITS.SPADE, value: 14, isBout: false }, // King (cannot discard)
    { id: 'spade_2', suit: SUITS.SPADE, value: 2, isBout: false },
    { id: 'spade_3', suit: SUITS.SPADE, value: 3, isBout: false },
    { id: 'heart_4', suit: SUITS.HEART, value: 4, isBout: false },
    { id: 'heart_5', suit: SUITS.HEART, value: 5, isBout: false },
    { id: 'club_6', suit: SUITS.CLUB, value: 6, isBout: false },
    { id: 'club_7', suit: SUITS.CLUB, value: 7, isBout: false },
    { id: 'trump_21', suit: SUITS.TRUMP, value: 21, isBout: true } // Bout (cannot discard)
  ];

  const discard = TarotAI.chooseChienDiscard(fullHand);
  assert.equal(discard.length <= 6, true);
  assert.equal(discard.some(c => c.value === 14), false, 'No Kings in discard');
  assert.equal(discard.some(c => c.isBout), false, 'No Bouts in discard');
});

test('TarotAI.choosePlayCard chooses a legal card', () => {
  const hand = [
    { id: 'spade_5', suit: SUITS.SPADE, value: 5 },
    { id: 'heart_10', suit: SUITS.HEART, value: 10 }
  ];
  const legalMoves = [hand[0]];
  
  const chosen = TarotAI.choosePlayCard({
    playerId: 1,
    hand,
    legalMoves,
    currentTrick: [],
    takerId: 0
  });

  assert.equal(chosen.id, 'spade_5');
});
