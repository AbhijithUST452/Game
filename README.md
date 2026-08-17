# 🐱 The Schrödinger Paradox

> A fast-paced, cyberpunk-themed 2D browser game where a quantum cat tries to survive Schrödinger's relentless box experiments.

---

## 👥 Team

**Team Name:** Schrödinger

**Members:**

- Abhijith
- Don
- Rahul
- Ashish

---

## 📖 Brief Description

The Schrödinger Paradox is a retro-futuristic, neon-drenched arcade game inspired by the famous Schrödinger's Cat thought experiment. Players take on the role of either the Cat — who must evade capture — or Schrödinger — the physicist who must box the cat using quantum-powered projectiles. The game features three distinct modes: Solo Cat, Solo Schrödinger, and a local Versus multiplayer mode.

---

## 🎯 Objective & Rules

- **As the Cat:** Survive for 60 seconds while dodging Schrödinger's boxes. The longer you survive, the higher your score. Collect powerups to gain temporary abilities.
- **As Schrödinger:** Hit the Cat with your boxes as many times as possible within 60 seconds. Unlock special box types (Multi, Tracking, Heavy) via powerups to increase your odds.

### Key Rules:

- The match lasts exactly **60 seconds**.
- The Cat earns **+5 points per second** survived.
- Schrödinger earns **+100 points per hit** (with combo multipliers for rapid hits).
- **Missed shots** are penalized: **-50 points** in Multiplayer & Solo Schrödinger, **-20 points** in Solo Cat.
- Multi-shot volleys (3 boxes) are penalized as a **single miss** only if **all 3 boxes** miss. If any one hits, no penalty.
- The Cat loses **-20 points** per hit taken.
- Schrödinger's **Observer Effect**: standing still for ~1.5 seconds slows the Cat dramatically.
- A **Quantum Hazard Zone** (red circle) appears periodically — it drains Cat score and slows Schrödinger.
- Walls block movement and destroy boxes on contact.

---

## 🕹️ How to Play

### Game Modes

| Mode                  | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| **Solo: The Cat**     | You play as the Cat. Evade the AI-controlled Schrödinger.     |
| **Solo: Schrödinger** | You play as Schrödinger. Box the AI-controlled Cat.           |
| **Versus Mode**       | Local 2-player. Player 1 is the Cat, Player 2 is Schrödinger. |

1. Select a game mode from the main menu.
2. Enter your player name(s).
3. Read the experiment protocols, then click **COMMENCE EXPERIMENT**.
4. Survive or dominate for 60 seconds!
5. After the round, choose **RESET TIMELINE** to replay or **MAIN MENU** to switch modes.

---

## 🎮 Controls

### Multiplayer Mode

| Action     | Cat (Player 1) | Schrödinger (Player 2) |
| ---------- | -------------- | ---------------------- |
| Move Up    | `W`            | `↑`                    |
| Move Down  | `S`            | `↓`                    |
| Move Left  | `A`            | `←`                    |
| Move Right | `D`            | `→`                    |
| Dash       | `Shift`        | —                      |
| Throw Box  | —              | `Space`                |

### Solo Modes (Both Characters)

| Action                       | Key                        |
| ---------------------------- | -------------------------- |
| Move                         | `↑` `↓` `←` `→` Arrow Keys |
| Dash (Cat only)              | `Shift`                    |
| Throw Box (Schrödinger only) | `Space`                    |

---

## 📊 Scoring Rules

| Event                                        | Points                                      |
| -------------------------------------------- | ------------------------------------------- |
| Cat survives per second                      | +5                                          |
| Schrödinger hits Cat                         | +100 × combo multiplier                     |
| Cat hit by box                               | -20                                         |
| Missed shot (Solo Cat / AI)                  | -20                                         |
| Missed shot (Multiplayer / Solo Schrödinger) | -50                                         |
| Multi-shot volley — all 3 miss               | -50 or -20 (mode-dependent, single penalty) |
| Multi-shot volley — at least 1 hit           | No penalty                                  |
| Cat inside Quantum Hazard Zone               | -2 per tick                                 |

### Combo System

Hitting the Cat multiple times within 3 seconds increases the combo multiplier (x2, x3, etc.), dramatically boosting Schrödinger's score per hit.

### Powerups

**Cat Powerups** (orange/white/magenta orbs):
| Powerup | Effect |
|---------|--------|
| 🟠 Zoomies | 1.8× speed boost for a limited time |
| ⚪ Ghost | Become semi-transparent and phase through walls & boxes |
| 🟣 Wormhole | Instantly teleport to a random safe location |

**Schrödinger Powerups** (red/cyan/orange orbs):
| Powerup | Effect |
|---------|--------|
| 🔴 Multi | Fire 3 boxes in a spread pattern (3 ammo) |
| 🔵 Tracking | Boxes home in on the Cat (3 ammo) |
| 🟠 Heavy | Fire a large, slow box (3 ammo) |

---

## 🛠️ Technologies Used

| Category       | Technology                                          |
| -------------- | --------------------------------------------------- |
| Structure      | HTML5                                               |
| Styling        | Vanilla CSS3                                        |
| Logic          | Vanilla JavaScript (ES6+)                           |
| Rendering      | HTML5 Canvas API                                    |
| Audio          | Web Audio API (SFX), HTML5 Audio (Background Music) |
| AI Pathfinding | Custom BFS (Breadth-First Search) grid pathfinder   |

No external libraries or frameworks were used. The entire game is built with vanilla HTML, CSS, and JavaScript.

---

## 🤖 AI Tool Used

**Google Gemini (Antigravity IDE)** — Used for pair programming, debugging, implementing AI pathfinding (BFS), sound effects system, game balancing, and iterative feature development.

---

## 🚀 Launch Instructions

1. Clone or download the project folder.
2. Ensure the following file structure exists:
   ```
   multiplayer/
   ├── index.html
   ├── README.md
   ├── css/
   │   └── styles.css
   ├── js/
   │   └── game.js
   └── assets/
       ├── cat.png
       ├── schrodinger.png
       └── bgaudio.mp3
   ```
3. Open `index.html` in a modern web browser.
4. **No build step, server, or installation required** — it runs directly from the file system.

> **Note:** Background music requires a user interaction (clicking a button) before it can play, due to browser autoplay policies.

---

## 🌐 Browsers Tested

| Browser                 | Status           |
| ----------------------- | ---------------- |
| Google Chrome (latest)  | ✅ Fully Working |
| Microsoft Edge (latest) | ✅ Fully Working |

---

## ⚠️ Known Limitations

- **Local multiplayer only** — no online/networked multiplayer support.
- **Fixed resolution** — the game canvas is 900×600px and does not scale responsively to different screen sizes.
- **Background music** may not autoplay on first load due to browser autoplay restrictions; requires a user click to start.
- **AI pathfinding** uses a grid-based BFS which recomputes every 20 frames; in rare edge cases with very tight wall configurations, the AI may briefly hesitate.
- **No mobile support** — the game requires a physical keyboard for input.
- **Ghost ability edge case** — if the Cat's Ghost powerup expires while inside a wall, the Cat is teleported to a safe location (by design, not a bug).

---

## 📜 Libraries & Asset Credits

- **Libraries:** None — 100% vanilla HTML/CSS/JavaScript.
- **Cat sprite:** Custom asset (`assets/cat.png`).
- **Schrödinger sprite:** Custom asset (`assets/schrodinger.png`).
- **Box sprite:** Inline SVG (procedurally generated).
- **Background music:** `assets/bgaudio.mp3` (custom/provided audio file).
- **Sound effects:** Procedurally generated using the Web Audio API (oscillator-based synthesis — no audio files needed).
- **Font:** System monospace (`Courier New`).

---

<p align="center">
  <em>"One does not simply observe a cat without changing its state."</em><br>
  — Team Schrödinger, 2026
</p>
