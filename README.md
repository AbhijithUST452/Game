# The Schrödinger Paradox

A cyberpunk arcade survival game where the Cat must survive a 60-second run while Schrödinger tries to box it using quantum-powered shots, power-ups, and tactical movement.

---

## Team / Participant

- Team Name: Schrödinger
- Team Members:
  - Abhijith Kannan
  - Don Jacob Vellathottam
  - Rahul Divakaran
  - Ashish Satheesh

---

## Brief Description

The Schrödinger Paradox is a fast-paced browser game inspired by the Schrödinger's cat. Players can choose between solo and local multiplayer gameplay, fight through obstacle-heavy arenas, collect power-ups, and outplay the opponent under time pressure. The game uses a neon cyberpunk visual theme with sound-driven action and AI-controlled challenge logic.

---

## Objective and Rules

### Objective

- In Solo Cat mode: survive as long as possible while avoiding Schrödinger's boxes.
- In Solo Schrödinger mode: box the Cat before the clock ends.
- In Local Multiplayer mode: one player controls the Cat and the other controls Schrödinger.

### Rules

- Each round lasts 60 seconds.
- The Cat gains +5 points for each second survived.
- Schrödinger gains +100 points for each successful hit.
- A Cat hit by a box costs -20 points.
- Missed shots are penalized depending on the mode.
- Power-ups appear periodically and affect movement, survivability, or attack strength.
- Walls block movement and can destroy boxes on impact.
- Radioactive zones appear during the match and damage both players over time.
- The game ends when the timer reaches 0 and the score screen is displayed.

---

## How to Play

1. Open the game in a browser.
2. Choose a mode from the home screen:
   - Solo Cat
   - Solo Schrödinger
   - Local Multiplayer PvP
3. Enter the required player name(s).
4. Press the start observation button to begin the match.
5. Survive or box the opponent for the full 60 seconds.
6. After the timer ends, view the score summary and leaderboard.

---

## Controls

### Solo Cat

- Move: Arrow keys
- Dash: Shift

### Solo Schrödinger

- Move: Arrow keys
- Shoot: Space

### Local Multiplayer

- Cat: W A S D to move, Shift to dash
- Schrödinger: Arrow keys to move, Space to shoot

---

## Scoring Rules

- Cat survives per second: +5
- Schrödinger hit on Cat: +100
- Cat hit by box: -20
- Missed Schrödinger shot on Solo Cat Mode: -20
- Missed Schrödinger shot on Solo Schrödinger and Local Multiplayer Mode: -50
- Cat inside hazard zone: -2 per tick
- Multi-hit combos can increase score gain when executed quickly in succession

Power-ups include:

- Cat power-ups: Zoomies, Ghost, Wormhole
- Schrödinger power-ups: Multi, Tracking, Heavy

---

## Technologies Used

- HTML5
- CSS3
- JavaScript (vanilla ES6+)
- HTML5 Canvas for rendering
- Web Audio API for synthesized sound effects
- Custom BFS pathfinding logic for AI movement
- Local Storage for leaderboard persistence

---

## AI Tool Used

- Microsoft 365 Copilot

---

## Launch Instructions

1. Open the project folder.
2. Go to the game folder: `Game`
3. Open `index.html` in a modern browser.
4. No build step or installation is required.

> The game runs directly in the browser from the project files.

---

## Browsers Tested

- Google Chrome: Tested and working
- Microsoft Edge: Tested and working
- Firefox: Not officially validated in this project run

---

## Known Limitations

- The game is designed for desktop keyboard input.
- Local multiplayer is supported but online multiplayer is not.
- Some AI pathfinding edge cases may still occur around dense obstacles.
- Sometimes background audio may require a user click before playing because of browser autoplay policies.
- The layout is optimized for a fixed desktop canvas rather than full responsive mobile support.
- Some response, audio and gameplay bugs are present.

---

## Libraries and Asset Credits

- Libraries: None required; the project is built with vanilla web technologies.
- Cat sprite: custom asset in the project assets folder
- Schrödinger sprite: custom asset in the project assets folder
- Sound effects: generated using the Web Audio API
- Background music: Cyberblade by max brhon - Licensed as a non-copyright / royalty-free track.
- Fonts: system monospace styling
- Art direction: custom neon cyberpunk styling prepared for the game interface and gameplay HUD

---

## Final Note

The Schrödinger Paradox combines fast reflexes, tactical movement, AI behavior, and arcade scoring in a compact browser game built for quick play sessions and competitive local matches.
