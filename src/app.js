import { AudioManager } from './components/audioManager.js';
import { UIController } from './components/uiController.js';

document.addEventListener('DOMContentLoaded', () => {
  const audioManager = new AudioManager();
  const uiController = new UIController(audioManager);

  // Resume Web Audio Context on first click anywhere
  const enableAudio = () => {
    audioManager.init();
    window.removeEventListener('click', enableAudio);
    window.removeEventListener('keydown', enableAudio);
  };

  window.addEventListener('click', enableAudio);
  window.addEventListener('keydown', enableAudio);

  uiController.init();
});
