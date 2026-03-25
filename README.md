# Shark Number Hunt 🦈

A Grade 3 educational math game built with **React + Phaser 3**.

## Project Structure

```
src/
├── App.jsx                    # Root component: HUD, progress bar, level complete
├── main.jsx                   # React entry point
├── index.css                  # Global styles
├── components/
│   └── GameCanvas.jsx         # Phaser mount + React bridge
├── game/
│   ├── GameScene.js           # Main Phaser scene (spawn, collision, state)
│   ├── Shark.js               # Shark class (evolution, movement, effects)
│   └── Fish.js                # Fish class (scroll, bubble label, eat effect)
└── utils/
    └── numberUtils.js         # even / odd / prime / composite logic
```

## Running

```bash
npm install
npm run dev
```

## Gameplay
- Move shark with your **mouse**
- Collect fish matching the current rule (Even / Odd / Prime / Composite)
- Collect **9 correct fish** to complete the level
- Shark **evolves** through 3 stages (baby → medium → fully grown)
