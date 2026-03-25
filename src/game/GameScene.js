/**
 * GameScene.js
 * Main Phaser 3 Scene – handles game loop, spawning, collision, state.
 * Communicates with React via an EventEmitter attached to the game instance.
 */

import Phaser from 'phaser';
import Shark from './Shark';
import Fish  from './Fish';
import { randomRule, generateFishPool, RULES } from '../utils/numberUtils';

/** How many correct fish to win the level */
const TARGET_SCORE = 9;
/** Max fish on screen simultaneously */
const MAX_FISH = 4;
/** Base spawn interval (ms) */
const SPAWN_INTERVAL = 2200;
/** Ground scroll speed */
const GROUND_SPEED = 55;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this._fishes   = [];
    this._score    = 0;
    this._gameOver = false;
    this._fishPool = [];
    this._poolIdx  = 0;
    this._rule     = '';
  }

  // ─── PRELOAD ─────────────────────────────────────────────────────────────
  preload() {
    // Assets live in /assets/ relative to public root
    this.load.image('background_water',    'assets/background_water.png');
    this.load.image('land_with_sand',      'assets/sand_plant_land.png');
    this.load.image('baby_shark',          'assets/baby_shark.png');
    this.load.image('medium_shark',        'assets/medium_shark.png');
    this.load.image('fully_grown_shark',   'assets/fully_grown_shark.png');
    this.load.image('small_fish',          'assets/small_fish.png');
    this.load.image('bubble',              'assets/bubble.png');

    // ── Sounds ────────────────────────────────────────────────
    this.load.audio('eat_sound',           'assets/eat.wav');
    this.load.audio('wrong_sound',         'assets/wrong.wav');
    this.load.audio('win_sound',           'assets/level_complete.wav');
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._rule     = randomRule();
    this._fishPool = this._shufflePool(generateFishPool(this._rule));
    this._poolIdx  = 0;
    this._score    = 0;
    this._gameOver = false;
    this._fishes   = [];

    // ── Background ────────────────────────────────────────────
    this.add.image(W / 2, H / 2, 'background_water')
      .setDisplaySize(W, H)
      .setDepth(0);

    // ── Scrolling ground strip (NEW APPROACH) ─────────────────
    // Using two plain images side-by-side that we manually scroll.
    // This guarantees the image always renders and never vanishes.
    this._ground1 = this.add.image(0, H, 'land_with_sand')
      .setOrigin(0, 1)
      .setDepth(5);
    this._ground1.setDisplaySize(W + 4, 300);

    this._ground2 = this.add.image(W, H, 'land_with_sand')
      .setOrigin(0, 1)
      .setDepth(5);
    this._ground2.setDisplaySize(W + 4, 300);

    // ── Shark ─────────────────────────────────────────────────
    this._shark = new Shark(this);

    // ── Fish spawn timer ───────────────────────────────────────
    this._spawnTimer = this.time.addEvent({
      delay:    SPAWN_INTERVAL,
      callback: this._spawnFish,
      callbackScope: this,
      loop:     true,
    });

    // ── Mouse input ────────────────────────────────────────────
    this.input.setPollAlways();

    // ── Emit initial state to React ────────────────────────────
    this._emitState();
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  update(_time, _delta) {
    if (this._gameOver) return;

    // Move shark toward pointer
    const pointer = this.input.activePointer;
    this._shark.update(pointer);

    // Scroll ground (two images leapfrog left)
    const scrollSpeed = GROUND_SPEED * (_delta / 1000) * 2;
    const W = this.scale.width;
    this._ground1.x -= scrollSpeed;
    this._ground2.x -= scrollSpeed;
    if (this._ground1.x + this._ground1.displayWidth < 0) this._ground1.x = this._ground2.x + this._ground2.displayWidth;
    if (this._ground2.x + this._ground2.displayWidth < 0) this._ground2.x = this._ground1.x + this._ground1.displayWidth;

    // Update fish & check collisions
    const activeFishes = this._fishes.filter(f => f.active);
    
    for (let i = activeFishes.length - 1; i >= 0; i--) {
      const fish = activeFishes[i];
      fish.update();

      // Remove off-screen fish
      if (fish.isOffscreen()) {
        fish.destroy();
        this._removeFish(fish);
        continue;
      }

      // ── PRECISION COLLISION DETECTION ───────────────────────
      // We check if the shark's CIRCLE physics body overlaps the fish's sprite body.
      // This is much more accurate than bounds-overlap which catches 'air' around images.
      if (this.physics.overlap(this._shark.sprite, fish.sprite)) {
        if (fish.correct) {
          this._shark.eatCorrect();
          this._score++;
          this._emitState();
          fish.eatEffect();
          this._removeFish(fish);

          // SFX & Vibe
          this.sound.play('eat_sound', { volume: 0.6 });
          this.cameras.main.shake(150, 0.008);

          if (this._score >= TARGET_SCORE) {
            this.sound.play('win_sound', { volume: 0.7 });
            this._triggerLevelComplete();
          }
        } else {
          this._shark.eatWrong();
          fish.destroy();
          this._removeFish(fish);
          
          this.sound.play('wrong_sound', { volume: 0.5 });
          this.cameras.main.shake(100, 0.005);
        }
      }
    }
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────────────
  
  pauseGame() {
    this.physics.world.pause();
    this._spawnTimer.paused = true;
  }

  resumeGame() {
    this.physics.world.resume();
    this._spawnTimer.paused = false;
  }

  _removeFish(fish) {
    const idx = this._fishes.indexOf(fish);
    if (idx !== -1) {
      this._fishes.splice(idx, 1);
    }
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────────────

  _spawnFish() {
    if (this._gameOver) return;
    if (this._fishes.filter(f => f.active).length >= MAX_FISH) return;

    const H = this.scale.height;
    const minY = 80;
    const maxY = H - 130;
    const spawnY = Phaser.Math.Between(minY, maxY);

    // Cycle through pool
    const data    = this._fishPool[this._poolIdx % this._fishPool.length];
    this._poolIdx++;

    // Re-shuffle when we've gone through the whole pool
    if (this._poolIdx % this._fishPool.length === 0) {
      this._fishPool = this._shufflePool(this._fishPool);
    }

    const speed = Phaser.Math.Between(150, 230);
    const fish  = new Fish(this, data.value, data.correct, spawnY, speed);
    this._fishes.push(fish);
  }

  _overlaps(a, b) {
    return !(
      a.right  <= b.left   ||
      a.left   >= b.right  ||
      a.bottom <= b.top    ||
      a.top    >= b.bottom
    );
  }

  _shufflePool(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _triggerLevelComplete() {
    this._gameOver = true;
    this._spawnTimer.remove();
    // Destroy remaining fish
    this._fishes.forEach(f => f.destroy());
    this._fishes = [];
    // Notify React
    this.game.events.emit('levelComplete', {
      rule:  this._rule,
      score: this._score,
    });
  }

  _emitState() {
    this.game.events.emit('gameState', {
      rule:      this._rule,
      ruleLabel: RULES[this._rule]?.label || '',
      score:     this._score,
      target:    TARGET_SCORE,
    });
  }

  // ─── RESTART ─────────────────────────────────────────────────────────────
  restartGame() {
    this._shark?.destroy();
    this._fishes.forEach(f => f.destroy());
    this._fishes = [];
    this.scene.restart();
  }
}
