import os
import re

def bundle():
    base_dir = r"c:\Users\kevin\Documents\Kevinours\Tarot"
    
    # Read CSS files
    css_files = ["styles/main.css", "styles/table.css", "styles/cards.css"]
    combined_css = ""
    for css_path in css_files:
        full_path = os.path.join(base_dir, css_path)
        if os.path.exists(full_path):
            with open(full_path, "r", encoding="utf-8") as f:
                combined_css += f"\n/* --- {css_path} --- */\n" + f.read()

    # Read JS files in dependency order
    js_files = [
        "src/engine/types.js",
        "src/engine/deck.js",
        "src/engine/rules.js",
        "src/engine/scoring.js",
        "src/engine/bidding.js",
        "src/engine/ai.js",
        "src/engine/stateMachine.js",
        "src/components/cardRenderer.js",
        "src/components/audioManager.js",
        "src/components/uiController.js",
        "src/app.js"
    ]

    combined_js = ""
    for js_path in js_files:
        full_path = os.path.join(base_dir, js_path)
        if os.path.exists(full_path):
            with open(full_path, "r", encoding="utf-8") as f:
                code = f.read()
                # Strip ES module import/export syntax for single bundle
                code = re.sub(r'^import\s+[^;]+;', '', code, flags=re.MULTILINE)
                code = re.sub(r'\bexport\s+default\s+', '', code)
                code = re.sub(r'\bexport\s+class\s+', 'class ', code)
                code = re.sub(r'\bexport\s+function\s+', 'function ', code)
                code = re.sub(r'\bexport\s+const\s+', 'const ', code)
                combined_js += f"\n// --- {js_path} ---\n" + code.strip() + "\n"

    # Always build from the canonical template, NOT from index.html
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Le tarot de Mamie Nicole</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
{combined_css}
  </style>
</head>
<body>
  <!-- Animated Sunburst Background -->
  <div class="sunburst-bg"></div>

  <!-- Main Application Wrapper -->
  <div id="app">
    <!-- Retro Header -->
    <header>
      <div class="game-title">Le tarot de Mamie Nicole</div>
      <div class="header-controls">
        <button class="btn-icon" id="sound-btn" title="Activer/Désactiver le son">🔊</button>
      </div>
    </header>

    <!-- Table Container -->
    <div class="table-container">
      <div class="tarot-table">

        <!-- Center Info & Trick Area -->
        <div class="center-info" id="center-info">
          <span>Phase: <strong>Initialisation...</strong></span>
        </div>

        <div class="trick-area" id="trick-area"></div>

        <!-- Joueur 2 (North) -->
        <div class="player-slot north" id="player-north">
          <div class="speech-bubble" id="bubble-north"></div>
          <div class="avatar-box">👵</div>
          <div class="player-name-tag">Joueur 2</div>
          <div class="player-score" id="score-north">0 pts</div>
        </div>

        <!-- Joueur 1 (West) -->
        <div class="player-slot west" id="player-west">
          <div class="speech-bubble" id="bubble-west"></div>
          <div class="avatar-box">👴</div>
          <div class="player-name-tag">Joueur 1</div>
          <div class="player-score" id="score-west">0 pts</div>
        </div>

        <!-- Joueur 3 (East) -->
        <div class="player-slot east" id="player-east">
          <div class="speech-bubble" id="bubble-east"></div>
          <div class="avatar-box">👩</div>
          <div class="player-name-tag">Joueur 3</div>
          <div class="player-score" id="score-east">0 pts</div>
        </div>

        <!-- Vous (South / Human) -->
        <div class="player-slot south" id="player-south">
          <div class="speech-bubble" id="bubble-south"></div>
          <div class="avatar-box">👦</div>
          <div class="player-name-tag">Vous</div>
          <div class="player-score" id="score-south">0 pts</div>
        </div>

      </div>
    </div>

    <!-- Human Hand Dock -->
    <div class="human-hand-container" id="human-hand"></div>
  </div>

  <!-- Bidding Modal (semi-transparent so hand is still visible below) -->
  <div class="modal-overlay" id="bidding-modal" style="display:none;">
    <div class="modal-content">
      <div class="modal-title" id="bidding-title">À vous d'annoncer !</div>
      <p style="color:#666; font-size:0.9rem; margin-bottom:4px;">Examinez vos cartes ci-dessous, puis choisissez votre contrat :</p>
      <div class="bidding-options" id="bidding-options"></div>
    </div>
  </div>

  <!-- Chien Discard Modal -->
  <div class="modal-overlay modal-solid" id="chien-modal" style="display:none;">
    <div class="modal-content" style="max-width:760px;">
      <div class="modal-title">Écart du Preneur</div>
      <p id="chien-instructions" style="margin-bottom:10px; font-weight:bold; color:#333;"></p>
      <div id="chien-cards-container" style="display:flex; flex-wrap:wrap; justify-content:center; max-height:310px; overflow-y:auto; margin-bottom:14px; gap:4px;"></div>
      <button class="btn-primary" id="confirm-chien-btn" disabled>Valider l'écart</button>
    </div>
  </div>

  <!-- Scoring Modal -->
  <div class="modal-overlay modal-solid" id="scoring-modal" style="display:none;">
    <div class="modal-content">
      <div class="modal-title">Résultats de la Manche</div>
      <div id="scoring-details"></div>
      <button class="btn-primary" id="next-round-btn" style="margin-top:18px;">Manche Suivante ▶</button>
    </div>
  </div>

  <script>
{combined_js}
  </script>
</body>
</html>"""

    out_path = os.path.join(base_dir, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    size = os.path.getsize(out_path)
    print(f"Bundle generated: {out_path} ({size} bytes)")

if __name__ == "__main__":
    bundle()
