/**
 * GameScene.js
 * Main Phaser 3 Scene – handles game loop, spawning, collision, state.
 * Receives { level } from LoadingScene via scene.start data.
 * Communicates with React via an EventEmitter attached to the game instance.
 */

import Phaser from 'phaser';
import Shark from './Shark';
import Fish  from './Fish';
import { generateFishPool, getLevelRule, RULES } from '../utils/numberUtils';

/** How many correct fish to win the level */
const TARGET_SCORE = 9;
/** Max fish on screen simultaneously */
const MAX_FISH = 4;
/** Base spawn interval (ms) */
const SPAWN_INTERVAL = 2200;
/** Ground scroll speed */
const GROUND_SPEED = 55;
/** Total number of levels */
const TOTAL_LEVELS = 4;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this._fishes   = [];
    this._score    = 0;
    this._gameOver = false;
    this._fishPool = [];
    this._poolIdx  = 0;
    this._rule     = '';
    this._level    = 1;
  }

  // ─── INIT (receives data from scene.start) ────────────────────────────────
  init(data) {
    this._level = data?.level ?? 1;
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._rule     = getLevelRule(this._level);
    this._fishPool = this._shufflePool(generateFishPool(this._rule));
    this._poolIdx  = 0;
    this._score    = 0;
    this._gameOver = false;
    this._fishes   = [];

    // ── Background ────────────────────────────────────────────
    this.add.image(W / 2, H / 2, 'background_water')
      .setDisplaySize(W, H)
      .setDepth(0);

    // ── Scrolling ground strip ─────────────────────────────────
    this._ground1 = this.add.image(0, H, 'land_with_sand')
      .setOrigin(0, 1)
      .setDepth(5);
    this._ground1.setDisplaySize(W * 1.2, 450);

    this._ground2 = this.add.image(W, H, 'land_with_sand')
      .setOrigin(0, 1)
      .setDepth(5);
    this._ground2.setDisplaySize(W * 1.2, 450);

    // ── Background Music ──────────────────────────────────────
    if (!this.sound.get('bg_music')) {
      const music = this.sound.add('bg_music', { volume: 0.3, loop: true });
      music.play();
    } else if (!this.sound.get('bg_music').isPlaying) {
      this.sound.get('bg_music').play();
    }

    // ── Fade-in camera ─────────────────────────────────────────
    this.cameras.main.fadeIn(400, 0, 10, 40);

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

    // ── Emit initial state ─────────────────────────────────────
    this._emitState();
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  update(_time, _delta) {
    if (this._gameOver) return;

    const pointer = this.input.activePointer;
    this._shark.update(pointer, _delta);

    // Scroll ground
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

      if (fish.isOffscreen()) {
        fish.destroy();
        this._removeFish(fish);
        continue;
      }

      if (this.physics.overlap(this._shark.sprite, fish.sprite)) {
        if (fish.correct) {
          this._shark.eatCorrect();
          this._score++;
          this._emitState();
          fish.eatEffect();
          this._removeFish(fish);

          this.sound.play('eat_sound', { volume: 0.6 });
          this.cameras.main.shake(150, 0.008);

          if (this._score >= TARGET_SCORE) {
            this.sound.play('win_sound', { volume: 0.7 });
            this._triggerLevelComplete();
          }
        } else {
          // Shark reacts but DOES NOT eat the wrong fish
          this._shark.eatWrong();
          this.sound.play('wrong_sound', { volume: 0.4 });
          this.cameras.main.shake(100, 0.005);
          
          // Add a brief transparency effect to the fish to show it wasn't caught
          this.tweens.add({
            targets: fish.sprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true
          });
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

  restartGame() {
    this._shark?.destroy();
    this._fishes.forEach(f => f.destroy());
    this._fishes = [];
    this.scene.restart({ level: this._level });
  }

  goToNextLevel() {
    this._shark?.destroy();
    this._fishes.forEach(f => f.destroy());
    this._fishes = [];
    const nextLevel = this._level < TOTAL_LEVELS ? this._level + 1 : 1;
    this.cameras.main.fadeOut(400, 0, 10, 40);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ level: nextLevel });
    });
  }

  _removeFish(fish) {
    const idx = this._fishes.indexOf(fish);
    if (idx !== -1) this._fishes.splice(idx, 1);
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────────────

  _spawnFish() {
    if (this._gameOver) return;
    if (this._fishes.filter(f => f.active).length >= MAX_FISH) return;

    const H = this.scale.height;
    const minY = 80;
    const maxY = H - 130;
    const spawnY = Phaser.Math.Between(minY, maxY);

    const data = this._fishPool[this._poolIdx % this._fishPool.length];
    this._poolIdx++;

    if (this._poolIdx % this._fishPool.length === 0) {
      this._fishPool = this._shufflePool(this._fishPool);
    }

    const speed = Phaser.Math.Between(150, 230);
    const fish  = new Fish(this, data.value, data.correct, spawnY, speed);
    this._fishes.push(fish);
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
    this._fishes.forEach(f => f.destroy());
    this._fishes = [];
    this.game.events.emit('levelComplete', {
      rule:       this._rule,
      ruleLabel:  RULES[this._rule]?.label || '',
      score:      this._score,
      level:      this._level,
      totalLevels: TOTAL_LEVELS,
      isLastLevel: this._level >= TOTAL_LEVELS,
    });
  }

  _emitState() {
    this.game.events.emit('gameState', {
      rule:      this._rule,
      ruleLabel: RULES[this._rule]?.label || '',
      score:     this._score,
      target:    TARGET_SCORE,
      level:     this._level,
      totalLevels: TOTAL_LEVELS,
    });
  }
}
