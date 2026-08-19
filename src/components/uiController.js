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
    this.startNewHand();
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

  updateTableUI() {
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
          <span>Pli: <strong>${this.game.trickCount + 1} / 18</strong></span>
        `;
      } else if (this.game.phase === GAME_PHASES.BIDDING) {
        this.dom.centerInfo.innerHTML = `<span>Phase: <strong>Annonces</strong></span>`;
      } else {
        this.dom.centerInfo.innerHTML = `<span>Phase: <strong>${this.game.phase}</strong></span>`;
      }
    }

    // 3. Render Human Hand (ALWAYS visible so player can examine cards)
    this.renderHumanHand();

    // 4. Render Center Trick Cards
    this.renderTrickCards();
  }

  renderHumanHand() {
    const human = this.game.players[0];
    this.dom.humanHand.innerHTML = '';

    const handWrapper = document.createElement('div');
    handWrapper.className = 'hand-cards-wrapper';

    const count = human.hand.length;
    if (count === 0) return;

    // Compact hand calculation: max width around 580px for 18 cards
    const containerWidth = Math.min(640, Math.max(320, (window.innerWidth || 800) - 100));
    const cardOffset = count > 1 ? Math.min(28, Math.max(16, (containerWidth - 70) / (count - 1))) : 0;
    const startX = -(count - 1) * cardOffset / 2;

    const isPlayingTurn = (this.game.phase === GAME_PHASES.PLAYING && this.game.currentTurnPlayerId === 0);
    const legalMoves = isPlayingTurn ? getLegalMoves(human.hand, this.game.currentTrick) : [];

    human.hand.forEach((card, index) => {
      // During trick play, highlight legal cards; during bidding/discard, all hand cards are enabled
      const isPlayable = isPlayingTurn ? legalMoves.some(c => c.id === card.id) : false;
      const isSelected = this.selectedChienCards.some(c => c.id === card.id);

      const cardEl = CardRenderer.renderCard(card, {
        isPlayable,
        isSelected,
        onClick: (c) => this.onHumanCardClick(c)
      });

      cardEl.className += ' hand-card-item';
      
      const posX = Math.round(startX + index * cardOffset);
      cardEl.style.setProperty('--card-x', `${posX}px`);
      cardEl.style.zIndex = index + 1;

      handWrapper.appendChild(cardEl);
    });

    this.dom.humanHand.appendChild(handWrapper);
  }

  renderTrickCards() {
    this.dom.trickArea.innerHTML = '';

    this.game.currentTrick.forEach(play => {
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
    this.updateTableUI();
    this.audio.playTrickSweep();

    const winnerName = this.game.players[step.winningPlay.playerId].name;
    this.showSpeechBubble(step.winningPlay.playerId, `Pli gagné !`, 1200);

    setTimeout(() => {
      if (this.game.phase === GAME_PHASES.SCORING) {
        this.showScoringModal();
      } else {
        this.processCurrentPhase();
      }
    }, 1300);
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
