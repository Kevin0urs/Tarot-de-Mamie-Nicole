import { SUITS } from '../engine/types.js';

/**
 * Creates DOM card element for French Tarot cards.
 */
export class CardRenderer {
  /**
   * Render a card element.
   * @param {Object} card Card object
   * @param {Object} options { isFaceDown, isPlayable, isSelected, onClick }
   */
  static renderCard(card, options = {}) {
    const cardEl = document.createElement('div');
    cardEl.className = 'tarot-card';

    if (options.isFaceDown) {
      cardEl.classList.add('back');
      return cardEl;
    }

    cardEl.dataset.cardId = card.id;
    cardEl.dataset.suit = card.suit;

    if (options.isPlayable) cardEl.classList.add('playable');
    if (options.isSelected) cardEl.classList.add('selected');
    if (options.isDisabled) cardEl.classList.add('disabled');

    // Rank text representation
    let rankText = `${card.value}`;
    if (card.suit !== SUITS.TRUMP && card.suit !== SUITS.EXCUSE) {
      if (card.value === 14) rankText = 'R';
      else if (card.value === 13) rankText = 'D';
      else if (card.value === 12) rankText = 'C';
      else if (card.value === 11) rankText = 'V';
    } else if (card.suit === SUITS.EXCUSE) {
      rankText = 'E';
    }

    const symbol = card.symbol || '★';

    // 1. Top Banner for Trump / Excuse
    if (card.suit === SUITS.TRUMP) {
      const banner = document.createElement('div');
      banner.className = 'trump-header-banner';
      banner.innerText = card.value === 1 ? 'PETIT' : (card.value === 21 ? '21 ATOUT' : `ATOUT ${card.value}`);
      cardEl.appendChild(banner);
    } else if (card.suit === SUITS.EXCUSE) {
      const banner = document.createElement('div');
      banner.className = 'excuse-header-banner';
      banner.innerText = 'EXCUSE';
      cardEl.appendChild(banner);
    }

    // 2. Top Left Corner
    const topLeft = document.createElement('div');
    topLeft.className = 'card-corner top-left';
    topLeft.innerHTML = `<div>${rankText}</div>${card.suit !== SUITS.TRUMP && card.suit !== SUITS.EXCUSE ? `<div class="suit-symbol">${symbol}</div>` : ''}`;

    // 3. Center Content
    const center = document.createElement('div');
    center.className = 'card-center';

    if (card.suit === SUITS.TRUMP) {
      center.innerHTML = `
        <div class="trump-frame">
          <div class="trump-number">${card.value}</div>
          ${card.isBout ? '<div class="bout-badge">BOUT</div>' : ''}
        </div>
      `;
    } else if (card.suit === SUITS.EXCUSE) {
      center.innerHTML = `
        <div class="trump-frame" style="background: rgba(255,255,255,0.25); border-color: #facc15;">
          <div class="court-art">🃏</div>
          <div class="bout-badge">BOUT</div>
        </div>
      `;
    } else {
      // Court cards vs pip cards
      if (card.value >= 11) {
        let icon = '♟️';
        if (card.value === 14) icon = '👑';
        else if (card.value === 13) icon = '👸';
        else if (card.value === 12) icon = '🐴';
        else if (card.value === 11) icon = '🛡️';
        center.innerHTML = `<div class="court-art">${icon}</div>`;
      } else {
        center.innerHTML = `<div class="suit-pip-center">${symbol}</div>`;
      }
    }

    // 4. Bottom Right Corner
    const bottomRight = document.createElement('div');
    bottomRight.className = 'card-corner bottom-right';
    bottomRight.innerHTML = `<div>${rankText}</div>${card.suit !== SUITS.TRUMP && card.suit !== SUITS.EXCUSE ? `<div class="suit-symbol">${symbol}</div>` : ''}`;

    cardEl.appendChild(topLeft);
    cardEl.appendChild(center);
    cardEl.appendChild(bottomRight);

    if (options.onClick) {
      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onClick(card);
      });
    }

    return cardEl;
  }
}
