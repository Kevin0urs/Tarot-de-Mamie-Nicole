import { GAME_PHASES, DEFAULT_PLAYERS, CONTRACTS } from './types.js';
import { createDeck, shuffleDeck, dealCards, sortHand } from './deck.js';
import { BiddingEngine } from './bidding.js';
import { getLegalMoves, getTrickWinner, isValidChienDiscard } from './rules.js';
import { calculateRoundScores } from './scoring.js';
import { TarotAI } from './ai.js';

const CLASSIC_NAMES = [
  { name: "Jean",       gender: "m" },
  { name: "Michel",     gender: "m" },
  { name: "Philippe",   gender: "m" },
  { name: "Alain",      gender: "m" },
  { name: "Christian",  gender: "m" },
  { name: "Patrick",    gender: "m" },
  { name: "Bernard",    gender: "m" },
  { name: "Gérard",     gender: "m" },
  { name: "Jacques",    gender: "m" },
  { name: "Monique",    gender: "f" },
  { name: "Françoise",  gender: "f" },
  { name: "Jacqueline", gender: "f" },
  { name: "Chantal",    gender: "f" },
  { name: "Martine",    gender: "f" },
  { name: "Brigitte",   gender: "f" },
  { name: "Catherine",  gender: "f" },
  { name: "Sylvie",     gender: "f" },
  { name: "Patricia",   gender: "f" },
  { name: "Daniel",     gender: "m" },
  { name: "Kévin",      gender: "m" }
];

const MALE_AVATARS   = ["👴", "👨", "🧔", "👱‍♂️", "🧑"];
const FEMALE_AVATARS = ["👵", "👩", "👱‍♀️", "🧕", "👩‍🦳"];

function pickAvatar(gender) {
  const pool = gender === "f" ? FEMALE_AVATARS : MALE_AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomAIPlayers() {
  const shuffled = [...CLASSIC_NAMES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map(p => ({
    name: p.name,
    avatar: pickAvatar(p.gender)
  }));
}

export class GameStateMachine {
  constructor(players = DEFAULT_PLAYERS) {
    const aiPlayers = getRandomAIPlayers();
    let aiIndex = 0;
    this.players = players.map(p => ({
      ...p,
      name:   p.isHuman ? p.name   : aiPlayers[aiIndex].name,
      avatar: p.isHuman ? p.avatar : aiPlayers[aiIndex++].avatar,
      hand: [],
      wonCards: []
    }));
    this.totalScores = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.dealerId = 2; // Initial dealer (Player 0 will start bidding on 1st round in CCW order)
    this.resetRound();
  }

  resetRound() {
    this.phase = GAME_PHASES.DEALING;
    this.dealerId = (this.dealerId - 1 + 4) % 4;
    this.firstBidderId = (this.dealerId - 1 + 4) % 4;
    this.currentTurnPlayerId = this.firstBidderId;
    
    this.players.forEach(p => {
      p.hand = [];
      p.wonCards = [];
      p.isPreneur = false;
    });

    this.chien = [];
    this.originalChien = [];
    this.biddingEngine = null;
    this.takerId = null;
    this.contract = CONTRACTS.PASSE;

    this.currentTrick = []; // [{ playerId, card }]
    this.tricksHistory = []; // Array of completed tricks
    this.trickCount = 0;
    this.petitAuBoutInfo = null;
    this.excuseOwners = []; // { playerId, playedInTrickIndex }
    this.roundResult = null;
  }

  startNewRound() {
    this.resetRound();
    const deck = shuffleDeck(createDeck());
    const { hands, chien } = dealCards(deck, this.dealerId);

    this.players.forEach((player, idx) => {
      player.hand = hands[idx];
    });
    this.chien = chien;
    this.originalChien = [...chien];

    this.biddingEngine = new BiddingEngine(this.firstBidderId);
    this.phase = GAME_PHASES.BIDDING;
    this.currentTurnPlayerId = this.firstBidderId;
  }

  processBid(contract) {
    if (this.phase !== GAME_PHASES.BIDDING) {
      throw new Error('Not in bidding phase');
    }

    const currentPlayer = this.players[this.currentTurnPlayerId];
    const result = this.biddingEngine.placeBid(currentPlayer.id, contract);

    if (result.isComplete) {
      if (this.biddingEngine.highestBid.id === CONTRACTS.PASSE.id) {
        // Everyone passed! Redeal round
        this.startNewRound();
        return { isRedeal: true };
      }

      // We have a taker!
      this.takerId = result.takerId;
      this.contract = result.highestBid;
      this.players.forEach(p => {
        p.isPreneur = (p.id === this.takerId);
      });

      // Handle Chien transition
      if (this.contract.id === CONTRACTS.PETITE.id || this.contract.id === CONTRACTS.GARDE.id) {
        this.phase = GAME_PHASES.CHIEN_REVEAL;
      } else {
        // Garde Sans or Garde Contre -> Skip discard phase directly to playing
        this.phase = GAME_PHASES.PLAYING;
        this.currentTurnPlayerId = this.firstBidderId;
      }
    } else {
      this.currentTurnPlayerId = this.biddingEngine.currentPlayerId;
    }

    return {
      bid: contract,
      highestBid: this.biddingEngine.highestBid,
      takerId: this.takerId,
      isComplete: this.biddingEngine.isComplete,
      phase: this.phase
    };
  }

  /**
   * Called when Preneur reveals and takes the Chien into their hand.
   */
  takeChien() {
    if (this.phase !== GAME_PHASES.CHIEN_REVEAL) return;
    const taker = this.players[this.takerId];
    taker.hand = sortHand([...taker.hand, ...this.chien]);
    this.phase = GAME_PHASES.CHIEN_DISCARD;
  }

  /**
   * Discards 6 cards into Chien (Écart) by Preneur.
   * @param {Array} discardedCards 6 Card objects
   */
  confirmChienDiscard(discardedCards) {
    if (this.phase !== GAME_PHASES.CHIEN_DISCARD) {
      throw new Error('Not in chien discard phase');
    }
    if (discardedCards.length !== 6) {
      throw new Error('Must discard exactly 6 cards');
    }

    const taker = this.players[this.takerId];
    const validHandCardIds = new Set(taker.hand.map(c => c.id));

    for (let card of discardedCards) {
      if (!validHandCardIds.has(card.id)) {
        throw new Error(`Card ${card.name} is not in taker's hand`);
      }
    }

    // Remove discarded cards from taker hand
    const discardIds = new Set(discardedCards.map(c => c.id));
    taker.hand = taker.hand.filter(c => !discardIds.has(c.id));
    
    // Store remaining chien / écart
    this.chien = discardedCards;

    // Move to playing phase starting with player right of dealer
    this.phase = GAME_PHASES.PLAYING;
    this.currentTurnPlayerId = this.firstBidderId;
  }

  playCard(playerId, card) {
    if (this.phase !== GAME_PHASES.PLAYING) {
      throw new Error('Not in playing phase');
    }
    if (playerId !== this.currentTurnPlayerId) {
      throw new Error(`It is player ${this.currentTurnPlayerId}'s turn, not player ${playerId}`);
    }

    const player = this.players[playerId];
    const legalMoves = getLegalMoves(player.hand, this.currentTrick);
    
    if (!legalMoves.some(c => c.id === card.id)) {
      throw new Error(`Illegal move: ${card.name}`);
    }

    // Remove card from hand
    player.hand = player.hand.filter(c => c.id !== card.id);

    // Add to current trick
    this.currentTrick.push({ playerId, card });

    let trickCompleted = false;
    let winningPlay = null;

    if (this.currentTrick.length === 4) {
      trickCompleted = true;
      this.trickCount++;
      const isLastTrick = (this.trickCount === 18);

      winningPlay = getTrickWinner(this.currentTrick, isLastTrick);
      const winnerId = winningPlay.playerId;
      const winnerPlayer = this.players[winnerId];

      // Check Petit au bout (1 of Trump played on trick 18)
      if (isLastTrick) {
        const petitPlay = this.currentTrick.find(p => p.card.suit === 'trump' && p.card.value === 1);
        if (petitPlay) {
          const isPreneurWin = (winnerPlayer.isPreneur);
          this.petitAuBoutInfo = {
            winnerId,
            isPreneurWin,
            playedByPlayerId: petitPlay.playerId
          };
        }
      }

      // Add trick cards to winner's won pile (handling Excuse rule)
      this.currentTrick.forEach(play => {
        if (play.card.suit === 'excuse' && !isLastTrick) {
          // Player who played Excuse keeps Excuse in their wonCards
          this.players[play.playerId].wonCards.push(play.card);
        } else {
          winnerPlayer.wonCards.push(play.card);
        }
      });

      this.tricksHistory.push({
        trickIndex: this.trickCount,
        trick: [...this.currentTrick],
        winnerId
      });

      // Next trick leader is winner
      this.currentTurnPlayerId = winnerId;
      this.currentTrick = [];

      // Check end of round (18 tricks completed)
      if (this.trickCount === 18) {
        this.finishRound();
      }
    } else {
      // Next player in trick
      this.currentTurnPlayerId = (this.currentTurnPlayerId - 1 + 4) % 4;
    }

    return {
      playerId,
      card,
      trickCompleted,
      winningPlay,
      nextPlayerId: this.currentTurnPlayerId,
      phase: this.phase,
      roundResult: this.roundResult
    };
  }

  finishRound() {
    this.phase = GAME_PHASES.SCORING;

    const taker = this.players[this.takerId];
    const defenseCards = [];

    this.players.forEach(p => {
      if (!p.isPreneur) {
        defenseCards.push(...p.wonCards);
      }
    });

    const result = calculateRoundScores({
      takerId: this.takerId,
      contract: this.contract,
      takerCards: taker.wonCards,
      defenseCards,
      chienCards: this.chien,
      petitAuBoutInfo: this.petitAuBoutInfo
    });

    // Update total scores
    for (let id = 0; id < 4; id++) {
      this.totalScores[id] += result.playerScores[id];
    }

    this.roundResult = result;
    return result;
  }
}
