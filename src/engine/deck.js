import { SUITS, getCardPoints, isBout } from './types.js';

/**
 * Creates the complete 78-card French Tarot deck.
 */
export function createDeck() {
  const deck = [];

  // 1. Excuse
  deck.push({
    id: 'excuse',
    suit: SUITS.EXCUSE,
    value: 0,
    name: 'L\'Excuse',
    points: 4.5,
    isBout: true
  });

  // 2. Trumps 1 to 21
  for (let i = 1; i <= 21; i++) {
    const bout = (i === 1 || i === 21);
    deck.push({
      id: `trump_${i}`,
      suit: SUITS.TRUMP,
      value: i,
      name: i === 1 ? ' Le Petit (1)' : `Atout ${i}`,
      points: bout ? 4.5 : 0.5,
      isBout: bout
    });
  }

  // 3. Suits (Spade, Heart, Diamond, Club) 1-14
  const suitList = [
    { key: SUITS.SPADE, name: 'Pique', symbol: '♠' },
    { key: SUITS.HEART, name: 'Cœur', symbol: '♥' },
    { key: SUITS.DIAMOND, name: 'Carreau', symbol: '♦' },
    { key: SUITS.CLUB, name: 'Trèfle', symbol: '♣' }
  ];

  const getRankName = (val) => {
    switch (val) {
      case 11: return 'Valet';
      case 12: return 'Cavalier';
      case 13: return 'Dame';
      case 14: return 'Roi';
      default: return `${val}`;
    }
  };

  suitList.forEach(suit => {
    for (let val = 1; val <= 14; val++) {
      const card = {
        id: `${suit.key}_${val}`,
        suit: suit.key,
        value: val,
        name: `${getRankName(val)} de ${suit.name}`,
        symbol: suit.symbol,
        points: getCardPoints({ suit: suit.key, value: val }),
        isBout: false
      };
      deck.push(card);
    }
  });

  return deck;
}

/**
 * Shuffles an array of cards using Fisher-Yates algorithm.
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals cards 3 by 3 to 4 players and puts 6 cards in the Chien.
 * Standard French Tarot distribution: 18 cards to 4 players + 6 in chien.
 * Official rule: First card and last card of the deck cannot be dealt to the Chien.
 * @param {Array} deck Shuffled 78-card deck
 * @param {number} dealerId Player ID dealing (0..3)
 */
export function dealCards(deck, dealerId = 0) {
  const hands = [[], [], [], []];
  const chien = [];
  
  // Deal order starts after the dealer: (dealerId - 1 + 4) % 4
  const startPlayer = (dealerId - 1 + 4) % 4;

  let deckIndex = 0;
  let cardsDealtToPlayers = 0;

  // We deal 24 rounds of 3 cards total (18*4 = 72 player cards + 6 chien cards = 78)
  // We can pick random positions for the 6 chien cards (excluding index 0 and index 77)
  const availableChienIndices = [];
  // Ensure Chien cards are put 1 by 1 during dealing, not 1st or last card
  const validChienPositions = [3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 71];
  
  // Pick 6 unique positions out of validChienPositions
  const selectedChienPositions = new Set();
  while (selectedChienPositions.size < 6) {
    const randomIndex = Math.floor(Math.random() * validChienPositions.length);
    selectedChienPositions.add(validChienPositions[randomIndex]);
  }

  let currentPlayer = startPlayer;

  for (let i = 0; i < 78; i++) {
    if (selectedChienPositions.has(i)) {
      chien.push(deck[i]);
    } else {
      hands[currentPlayer].push(deck[i]);
      cardsDealtToPlayers++;
      if (cardsDealtToPlayers % 3 === 0) {
        currentPlayer = (currentPlayer - 1 + 4) % 4;
      }
    }
  }

  // Sort each player's hand nicely
  hands.forEach((hand, idx) => {
    hands[idx] = sortHand(hand);
  });

  return { hands, chien };
}

/**
 * Sorts a hand by Trump (21 down to 1), Excuse, and Suits (Spade, Heart, Club, Diamond) high to low.
 */
export function sortHand(hand) {
  const suitOrder = {
    [SUITS.EXCUSE]: 0,
    [SUITS.TRUMP]: 1,
    [SUITS.SPADE]: 2,
    [SUITS.HEART]: 3,
    [SUITS.CLUB]: 4,
    [SUITS.DIAMOND]: 5
  };

  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.value - a.value;
  });
}
