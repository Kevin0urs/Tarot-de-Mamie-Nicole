import { GAME_PHASES, CONTRACTS, DEFAULT_PLAYERS } from '../engine/types.js';
import { GameStateMachine } from '../engine/stateMachine.js';
import { CardRenderer } from './cardRenderer.js';
import { TarotAI } from '../engine/ai.js';
import { getLegalMoves, isValidChienDiscard } from '../engine/rules.js';

export class UIController {
  constructor(audioManager) {
    this.audio = audioManager;
    this.game = new GameStateMachine(DEFAULT_PLAYERS);
    this.selectedChienCards = [];
    this.isProcessingAI = false;
  }

  init() {
    this.bindDOM();
    this.setupPlayerNames();
    this.startNewHand();
  }

  setupPlayerNames() {
    this.game.players.forEach(p => {
      const slot = this.dom.playerSlots[p.id];
      if (slot) {
        const nameTag = slot.querySelector('.player-name-tag');
        if (nameTag) nameTag.innerText = p.name;
        const avatarBox = slot.querySelector('.avatar-box');
        if (avatarBox && p.avatar) avatarBox.innerText = p.avatar;
      }
    });
  }

  bindDOM() {
    this.dom = {
      biddingModal: document.getElementById('bidding-modal'),
      biddingOptions: document.getElementById('bidding-options'),
      biddingTitle: document.getElementById('bidding-title'),
      chienModal: document.getElementById('chien-modal'),
      chienContainer: document.getElementById('chien-cards-container'),
      confirmChienBtn: document.getElementById('confirm-chien-btn'),
      chienInstructions: document.getElementById('chien-instructions'),
      scoringModal: document.getElementById('scoring-modal'),
      scoringDetails: document.getElementById('scoring-details'),
      nextRoundBtn: document.getElementById('next-round-btn'),
      humanHand: document.getElementById('human-hand'),
      trickArea: document.getElementById('trick-area'),
      centerInfo: document.getElementById('center-info'),
      playerSlots: {
        0: document.getElementById('player-south'),
        1: document.getElementById('player-west'),
        2: document.getElementById('player-north'),
        3: document.getElementById('player-east')
      },
      playerBubbles: {
        0: document.getElementById('bubble-south'),
        1: document.getElementById('bubble-west'),
        2: document.getElementById('bubble-north'),
        3: document.getElementById('bubble-east')
      },
      playerScores: {
        0: document.getElementById('score-south'),
        1: document.getElementById('score-west'),
        2: document.getElementById('score-north'),
        3: document.getElementById('score-east')
      }
    };

    if (this.dom.nextRoundBtn) {
      this.dom.nextRoundBtn.addEventListener('click', () => {
        this.dom.scoringModal.style.display = 'none';
        this.startNewHand();
      });
    }

    if (this.dom.confirmChienBtn) {
      this.dom.confirmChienBtn.addEventListener('click', () => {
        this.onConfirmChienDiscard();
      });
    }
  }

  startNewHand() {
    this.selectedChienCards = [];
    this.game.startNewRound();
    this.audio.playCardSlide();
    this.updateTableUI();
    this.processCurrentPhase();
  }

  updatePlayerSlots() {
    // 1. Update Player Slots & Total Scores
    this.game.players.forEach(p => {
      const slot = this.dom.playerSlots[p.id];
      if (!slot) return;

      const isCurrentTurn = (this.game.currentTurnPlayerId === p.id);
      slot.classList.toggle('active-turn', isCurrentTurn);

      // Preneur badge
      let badge = slot.querySelector('.preneur-badge');
      if (p.isPreneur) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'preneur-badge';
          badge.innerText = 'Preneur';
          slot.querySelector('.avatar-box').appendChild(badge);
        }
      } else if (badge) {
        badge.remove();
      }

      const scoreEl = this.dom.playerScores[p.id];
      if (scoreEl) {
        const total = this.game.totalScores[p.id];
        scoreEl.innerText = `${total >= 0 ? '+' : ''}${total} pts`;
      }
    });

    // 2. Update Center Info
    if (this.dom.centerInfo) {
      if (this.game.phase === GAME_PHASES.PLAYING) {
        this.dom.centerInfo.innerHTML = `
          <span>Contrat: <strong>${this.game.contract.name}</strong></span>
          <span>Pli: <strong>${this.game.trickCount} / 18</strong></span>
        `;
      } else if (this.game.phase === GAME_PHASES.BIDDING) {
        this.dom.centerInfo.innerHTML = `<span>Phase: <strong>Annonces</strong></span>`;
      } else {
        this.dom.centerInfo.innerHTML = `<span>Phase: <strong>${this.game.phase}</strong></span>`;
      }
    }
  }

  updateTableUI() {
    // Delegate player slot / score / center info update
    this.updatePlayerSlots();

    // Render Human Hand (ALWAYS visible so player can examine cards)
    this.renderHumanHand();

    // Render Center Trick Cards (live currentTrick)
    this.renderTrickCards();
  }

  renderHumanHand() {
    const human = this.game.players[0];
    this.dom.humanHand.innerHTML = '';

    const count = human.hand.length;
    if (count === 0) return;

    const isPlayingTurn = (this.game.phase === GAME_PHASES.PLAYING && this.game.currentTurnPlayerId === 0);
    const legalMoves = isPlayingTurn ? getLegalMoves(human.hand, this.game.currentTrick) : [];

    // Split hand in half
    const half = Math.ceil(count / 2);
    const topCards = human.hand.slice(0, half);
    const bottomCards = human.hand.slice(half);

    const renderRow = (cards, rowClass, isBottomRow) => {
      const rowWrapper = document.createElement('div');
      rowWrapper.className = `hand-cards-row ${rowClass}`;
      
      const k = cards.length;
      if (k === 0) return rowWrapper;

      // 8vw width per card. Overlap 20% means card offset is 6.4vw.
      // Total width of row of k cards = (k - 1) * 6.4vw + 8vw.
      const rowWidthVw = (k - 1) * 6.4 + 8;
      rowWrapper.style.width = `${rowWidthVw}vw`;

      cards.forEach((card, index) => {
        const isPlayable = isPlayingTurn ? legalMoves.some(c => c.id === card.id) : false;
        const isSelected = this.selectedChienCards.some(c => c.id === card.id);

        const cardEl = CardRenderer.renderCard(card, {
          isPlayable,
          isSelected,
          onClick: (c) => this.onHumanCardClick(c)
        });

        cardEl.className += ' hand-card-item';
        cardEl.style.position = 'absolute';
        cardEl.style.left = `${index * 6.4}vw`;
        cardEl.style.top = '0';
        cardEl.style.zIndex = index + 1;

        rowWrapper.appendChild(cardEl);
      });

      return rowWrapper;
    };

    const topRowEl = renderRow(topCards, 'top-row', false);
    const bottomRowEl = renderRow(bottomCards, 'bottom-row', true);

    this.dom.humanHand.appendChild(topRowEl);
    this.dom.humanHand.appendChild(bottomRowEl);
  }

  renderTrickCards(plays) {
    this.dom.trickArea.innerHTML = '';
    // Use provided plays array if given (e.g. completed trick snapshot), otherwise live trick
    const trick = plays || this.game.currentTrick;

    trick.forEach(play => {
      const player = this.game.players[play.playerId];
      const cardEl = CardRenderer.renderCard(play.card);
      
      const wrapper = document.createElement('div');
      wrapper.className = 'trick-card-slot';
      wrapper.dataset.position = player.position;
      wrapper.appendChild(cardEl);

      this.dom.trickArea.appendChild(wrapper);
    });
  }

  showSpeechBubble(playerId, text, durationMs = 2000) {
    const bubble = this.dom.playerBubbles[playerId];
    if (!bubble) return;

    bubble.innerText = text;
    bubble.classList.add('visible');

    setTimeout(() => {
      bubble.classList.remove('visible');
    }, durationMs);
  }

  processCurrentPhase() {
    this.updateTableUI();

    switch (this.game.phase) {
      case GAME_PHASES.BIDDING:
        this.processBiddingTurn();
        break;

      case GAME_PHASES.CHIEN_REVEAL:
        this.processChienReveal();
        break;

      case GAME_PHASES.CHIEN_DISCARD:
        this.processChienDiscard();
        break;

      case GAME_PHASES.PLAYING:
        this.processPlayingTurn();
        break;

      case GAME_PHASES.SCORING:
        this.showScoringModal();
        break;
    }
  }

  // --- BIDDING PHASE ---
  processBiddingTurn() {
    const currentId = this.game.currentTurnPlayerId;
    const player = this.game.players[currentId];

    if (player.isHuman) {
      this.showHumanBiddingModal();
    } else {
      // AI Bidding Turn
      this.dom.biddingModal.style.display = 'none';
      setTimeout(() => {
        const bid = TarotAI.chooseBid(player.hand, this.game.biddingEngine.highestBid);
        this.showSpeechBubble(player.id, bid.name);
        this.audio.playBidChime();

        const result = this.game.processBid(bid);
        if (result.isRedeal) {
          this.showSpeechBubble(0, 'Tout le monde passe ! Redistribution...');
        }
        this.processCurrentPhase();
      }, 700);
    }
  }

  showHumanBiddingModal() {
    this.dom.biddingModal.style.display = 'flex';
    this.dom.biddingOptions.innerHTML = '';

    const validContracts = this.game.biddingEngine.getValidContracts();

    validContracts.forEach(contract => {
      const btn = document.createElement('button');
      btn.className = contract.id === 'passe' ? 'btn-secondary' : 'btn-primary';
      btn.innerText = contract.name;
      btn.addEventListener('click', () => {
        this.dom.biddingModal.style.display = 'none';
        this.showSpeechBubble(0, contract.name);
        this.audio.playBidChime();
        this.game.processBid(contract);
        this.processCurrentPhase();
      });
      this.dom.biddingOptions.appendChild(btn);
    });
  }

  // --- CHIEN PHASE ---
  processChienReveal() {
    const taker = this.game.players[this.game.takerId];
    this.showSpeechBubble(taker.id, `Reçoit le Chien !`);

    if (taker.isHuman) {
      setTimeout(() => {
        this.game.takeChien();
        this.processCurrentPhase();
      }, 1000);
    } else {
      setTimeout(() => {
        this.game.takeChien();
        const fullHand = taker.hand;
        const discard = TarotAI.chooseChienDiscard(fullHand);
        this.game.confirmChienDiscard(discard);
        this.showSpeechBubble(taker.id, `Écart réalisé !`);
        this.processCurrentPhase();
      }, 1200);
    }
  }

  processChienDiscard() {
    const taker = this.game.players[this.game.takerId];
    if (taker.isHuman) {
      this.dom.chienModal.style.display = 'flex';
      this.renderChienModalContent();
    }
  }

  renderChienModalContent() {
    const taker = this.game.players[0];
    this.dom.chienContainer.innerHTML = '';

    const count = this.selectedChienCards.length;
    this.dom.chienInstructions.innerText = `Sélectionnez 6 cartes à écarter (${count} / 6)`;

    this.dom.confirmChienBtn.disabled = (count !== 6);

    taker.hand.forEach(card => {
      const isSelected = this.selectedChienCards.some(c => c.id === card.id);
      const cardEl = CardRenderer.renderCard(card, {
        isSelected,
        onClick: (c) => {
          if (isSelected) {
            this.selectedChienCards = this.selectedChienCards.filter(x => x.id !== c.id);
          } else {
            if (this.selectedChienCards.length < 6) {
              if (isValidChienDiscard(c, taker.hand, this.selectedChienCards)) {
                this.selectedChienCards.push(c);
              } else {
                alert(`Impossible d'écarter cette carte ! (Interdiction d'écarter les Rois, les Bouts, ou les Atouts sauf si vous n'avez pas le choix).`);
              }
            }
          }
          this.renderChienModalContent();
          this.renderHumanHand();
        }
      });
      cardEl.style.margin = '4px';
      this.dom.chienContainer.appendChild(cardEl);
    });
  }

  onConfirmChienDiscard() {
    if (this.selectedChienCards.length !== 6) return;
    this.game.confirmChienDiscard(this.selectedChienCards);
    this.selectedChienCards = [];
    this.dom.chienModal.style.display = 'none';
    this.audio.playCardSnap();
    this.processCurrentPhase();
  }

  // --- TRICK PLAYING PHASE ---
  processPlayingTurn() {
    if (this.isProcessingAI) return;

    const currentId = this.game.currentTurnPlayerId;
    const player = this.game.players[currentId];

    if (player.isHuman) {
      // Human turn: ready for card click
      return;
    }

    // AI Player Turn
    this.isProcessingAI = true;
    setTimeout(() => {
      const legalMoves = getLegalMoves(player.hand, this.game.currentTrick);
      const chosenCard = TarotAI.choosePlayCard({
        playerId: player.id,
        hand: player.hand,
        legalMoves,
        currentTrick: this.game.currentTrick,
        takerId: this.game.takerId,
        tricksHistory: this.game.tricksHistory
      });

      this.audio.playCardSnap();
      const step = this.game.playCard(player.id, chosenCard);
      this.isProcessingAI = false;

      if (step.trickCompleted) {
        this.handleTrickCompleted(step);
      } else {
        this.processCurrentPhase();
      }
    }, 600);
  }

  onHumanCardClick(card) {
    if (this.game.phase !== GAME_PHASES.PLAYING) return;
    if (this.game.currentTurnPlayerId !== 0) return;
    if (this.isProcessingAI) return;

    const human = this.game.players[0];
    const legalMoves = getLegalMoves(human.hand, this.game.currentTrick);
    
    if (!legalMoves.some(c => c.id === card.id)) {
      this.showSpeechBubble(0, "Carte non autorisée ! Vous devez fournir ou couper.");
      return;
    }

    this.audio.playCardSnap();
    const step = this.game.playCard(0, card);

    if (step.trickCompleted) {
      this.handleTrickCompleted(step);
    } else {
      this.processCurrentPhase();
    }
  }

  handleTrickCompleted(step) {
    // Step 1: The game engine has already moved cards to wonCards and cleared currentTrick.
    // Retrieve the completed trick snapshot from tricksHistory (the just-finished trick).
    const completedTrick = this.game.tricksHistory[this.game.tricksHistory.length - 1];
    const trickPlays = completedTrick ? completedTrick.trick : [];

    // Step 2: Show all 4 cards on the table so the player can see them.
    // updateTableUI() would use the now-empty currentTrick, so we update everything EXCEPT the trick area,
    // then manually render the completed trick snapshot.
    this.updatePlayerSlots();
    this.renderHumanHand();
    this.renderTrickCards(trickPlays); // Display all 4 completed trick cards

    // Step 3: After a clear pause (1600ms), sweep the cards away and announce winner.
    setTimeout(() => {
      this.audio.playTrickSweep();
      this.showSpeechBubble(step.winningPlay.playerId, `Pli gagné !`, 1400);

      // Clear the trick area visually (sweep animation)
      this.dom.trickArea.innerHTML = '';
      this.updateTableUI(); // Now refresh normally (currentTrick is empty)

      setTimeout(() => {
        if (this.game.phase === GAME_PHASES.SCORING) {
          this.showScoringModal();
        } else {
          this.processCurrentPhase();
        }
      }, 1000);
    }, 1600);
  }

  showScoringModal() {
    const res = this.game.roundResult;
    if (!res) return;

    this.audio.playFanfare();
    this.dom.scoringModal.style.display = 'flex';

    const takerName = this.game.players[res.takerId].name;

    this.dom.scoringDetails.innerHTML = `
      <div style="font-size: 1.2rem; margin-bottom: 12px; color: ${res.isWon ? '#27ae60' : '#c0392b'}; font-weight: 800;">
        ${takerName} a ${res.isWon ? 'GAGNÉ' : 'PERDU'} son contrat ${res.contract.name} !
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr><td style="padding: 6px; font-weight: bold;">Points faits par le preneur:</td><td>${res.preneurPoints} pts</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Points nécessaires (${res.preneurBouts} Bout${res.preneurBouts > 1 ? 's' : ''}):</td><td>${res.pointTarget} pts</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Écart / Différence:</td><td>${res.diff >= 0 ? '+' : ''}${res.diff} pts</td></tr>
        ${res.petitAuBoutPoints !== 0 ? `<tr><td style="padding: 6px; font-weight: bold;">Petit au bout:</td><td>${res.petitAuBoutPoints > 0 ? '+10' : '-10'} pts</td></tr>` : ''}
      </table>
      <div style="font-weight: 900; font-size: 1.1rem; margin-bottom: 10px;">Scores de la manche :</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-weight: bold;">
        ${this.game.players.map(p => `
          <div style="background: #eee; padding: 6px 10px; border-radius: 8px; display: flex; justify-content: space-between;">
            <span>${p.name}:</span>
            <span style="color: ${res.playerScores[p.id] >= 0 ? '#27ae60' : '#c0392b'}">${res.playerScores[p.id] >= 0 ? '+' : ''}${res.playerScores[p.id]}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}
