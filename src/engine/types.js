/**
 * Types and Constants for 4-Player French Tarot
 */

export const SUITS = {
  SPADE: 'spade',
  HEART: 'heart',
  DIAMOND: 'diamond',
  CLUB: 'club',
  TRUMP: 'trump',
  EXCUSE: 'excuse'
};

export const CONTRACTS = {
  PASSE: { id: 'passe', name: 'Passe', multiplier: 0, priority: 0 },
  PETITE: { id: 'petite', name: 'Petite', multiplier: 1, priority: 1 },
  GARDE: { id: 'garde', name: 'Garde', multiplier: 2, priority: 2 },
  GARDE_SANS: { id: 'garde_sans', name: 'Garde Sans', multiplier: 4, priority: 3 },
  GARDE_CONTRE: { id: 'garde_contre', name: 'Garde Contre', multiplier: 6, priority: 4 }
};

export const PLAYER_POSITIONS = ['south', 'west', 'north', 'east'];

export const DEFAULT_PLAYERS = [
  { id: 0, name: 'Vous', isHuman: true, position: 'south', avatar: 'human' },
  { id: 1, name: 'Joueur 1', isHuman: false, position: 'west', avatar: 'papi' },
  { id: 2, name: 'Joueur 2', isHuman: false, position: 'north', avatar: 'mamie' },
  { id: 3, name: 'Joueur 3', isHuman: false, position: 'east', avatar: 'tante' }
];

export const GAME_PHASES = {
  DEALING: 'DEALING',
  BIDDING: 'BIDDING',
  CHIEN_REVEAL: 'CHIEN_REVEAL',
  CHIEN_DISCARD: 'CHIEN_DISCARD',
  PLAYING: 'PLAYING',
  SCORING: 'SCORING',
  GAME_OVER: 'GAME_OVER'
};

/**
 * Card point values according to FFT standard:
 * King = 4.5
 * Queen = 3.5
 * Knight (Cavalier) = 2.5
 * Jack (Valet) = 1.5
 * Bouts (1 of Trump, 21 of Trump, Excuse) = 4.5 pts
 * All other cards (Petites cards and Trumps 2-20) = 0.5 pt
 * Total deck points = 91
 */
export function getCardPoints(card) {
  if (card.suit === SUITS.EXCUSE) return 4.5;
  if (card.suit === SUITS.TRUMP) {
    if (card.value === 1 || card.value === 21) return 4.5;
    return 0.5;
  }
  switch (card.value) {
    case 14: return 4.5; // King (Roi)
    case 13: return 3.5; // Queen (Dame)
    case 12: return 2.5; // Knight (Cavalier)
    case 11: return 1.5; // Jack (Valet)
    default: return 0.5;
  }
}

export function isBout(card) {
  if (card.suit === SUITS.EXCUSE) return true;
  if (card.suit === SUITS.TRUMP && (card.value === 1 || card.value === 21)) return true;
  return false;
}
