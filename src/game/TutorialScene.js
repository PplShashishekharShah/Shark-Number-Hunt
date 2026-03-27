/**
 * TutorialScene.js
 * Fully scripted tutorial. Steps advance ONLY after React calls nextStep()
 * (which happens automatically once speech synthesis finishes reading the text).
 */
import Phaser from 'phaser';
import Shark  from './Shark';
import Fish   from './Fish';

const GROUND_SPEED = 55;
const START_X_RATIO = 0.18;
const START_Y_RATIO = 0.50;

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene' });
    this._step   = 0;
    this._fishes = [];
    this._busy   = false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._W = W; this._H = H;

    // ── Background ────────────────────────────────────────────────
    this.add.image(W / 2, H / 2, 'background_water')
      .setDisplaySize(W, H).setDepth(0);

    // ── Ground (scrolling) ────────────────────────────────────────
    this._ground1 = this.add.image(0, H, 'land_with_sand')
      .setOrigin(0, 1).setDepth(5).setDisplaySize(W * 1.3, 450);
    this._ground2 = this.add.image(W, H, 'land_with_sand')
      .setOrigin(0, 1).setDepth(5).setDisplaySize(W * 1.3, 450);

    // ── Shark ─────────────────────────────────────────────────────
    this._shark = new Shark(this);
    this._startX = W * START_X_RATIO;
    this._startY = H * START_Y_RATIO;
    this._shark.sprite.setPosition(this._startX, this._startY);

    // ── Hand emoji ────────────────────────────────────────────────
    this._hand = this.add.text(0, 0, '🫳', { fontSize: '50px' })
      .setDepth(100).setAlpha(0).setOrigin(0.5, 0);

    // ── Fade in & begin ───────────────────────────────────────────
    this.cameras.main.fadeIn(400, 0, 10, 40);
    this.time.delayedCall(500, () => this._runStep1());
  }

  update(_t, delta) {
    // Scroll ground
    const speed = GROUND_SPEED * (delta / 1000) * 2;
    this._ground1.x -= speed;
    this._ground2.x -= speed;
    const W = this._W;
    if (this._ground1.x + this._ground1.displayWidth < 0)
      this._ground1.x = this._ground2.x + this._ground2.displayWidth;
    if (this._ground2.x + this._ground2.displayWidth < 0)
      this._ground2.x = this._ground1.x + this._ground1.displayWidth;

    // Update fish
    for (let i = this._fishes.length - 1; i >= 0; i--) {
      const f = this._fishes[i];
      if (!f.active) { this._fishes.splice(i, 1); continue; }
      f.update();
      if (f.isOffscreen()) { f.destroy(); this._fishes.splice(i, 1); continue; }
    }

    // Sync hand emoji to follow shark
    this._hand.x = this._shark.sprite.x + 32;
    this._hand.y = this._shark.sprite.y + 22;

    // Advance shark frame animation (use shark's own position as "pointer" so no lerp drift)
    const sx = this._shark.sprite.x;
    const sy = this._shark.sprite.y;
    this._shark.update({ x: sx, y: sy }, delta);
    // Restore exact position since shark.update() lerps toward pointer — we don't want drift
    this._shark.sprite.setPosition(sx, sy);
  }

  // ── STEP 1: Greeting — shark moves around ─────────────────────────

  _runStep1() {
    this._step = 1;
    this._emitStep("I'm your Number Shark!\nMove me with your mouse to hunt Numbers");

    this.tweens.add({ targets: this._hand, alpha: 1, duration: 400 });

    // Demonstrate movement — up-down-return
    this._moveTo(this._W * 0.45, this._H * 0.35, 1400, () => {
      this._moveTo(this._W * 0.45, this._H * 0.62, 1400, () => {
        this._moveTo(this._startX, this._startY, 1000);
        // Step completes; React will call nextStep() once voice finishes
      });
    });
  }

  // ── STEP 2: Eat correct fish ──────────────────────────────────────
  _runStep2() {
    this._step = 2;
    this._emitStep("Eat the RIGHT number!\nI eat it and grow BIGGER!");

    const H = this._H;
    const correctFish = new Fish(this, 7, true, H * 0.45, 0);
    correctFish.sprite.setX(this._W * 0.75);
    this._fishes.push(correctFish);

    this.time.delayedCall(800, () => {
      this._moveTo(correctFish.sprite.x - 50, correctFish.sprite.y, 1200, () => {
        // Eat it
        if (correctFish.active) {
          this._shark.eatCorrect();
          this._shark.playEatingEffect(correctFish.sprite.x, correctFish.sprite.y);
          correctFish.eatEffect();
          this.sound.play('eat_sound', { volume: 0.5 });
          this.cameras.main.shake(120, 0.007);
        }
        // Return to start after eating
        this.time.delayedCall(600, () => {
          this._moveTo(this._startX, this._startY, 900);
        });
      });
    });
  }

  // ── STEP 3: Touch wrong fish ──────────────────────────────────────
  _runStep3() {
    this._step = 3;
    this._emitStep("Avoid WRONG numbers!\nI turn RED and get dizzy — bad!");

    const H = this._H;
    const wrongFish = new Fish(this, 4, false, H * 0.52, 0);
    wrongFish.sprite.setX(this._W * 0.75);
    this._fishes.push(wrongFish);

    this.time.delayedCall(800, () => {
      this._moveTo(wrongFish.sprite.x - 50, wrongFish.sprite.y, 1200, () => {
        // React wrongly
        if (!this._shark._isTingingRed) {
          this._shark.eatWrong();
          this.sound.play('wrong_sound', { volume: 0.4 });
          this.cameras.main.shake(80, 0.005);
          this.tweens.add({ targets: wrongFish.sprite, alpha: 0.4, duration: 80, yoyo: true, repeat: 3 });
        }
        // Return to start
        this.time.delayedCall(1100, () => {
          this._moveTo(this._startX, this._startY, 900);
        });
      });
    });
  }

  // ── STEP 4: Outro ─────────────────────────────────────────────────
  _runStep4() {
    this._step = 4;
    this._emitStep("Collect 9 correct fish to win a level!\nGood luck — dive in!");

    // Gentle happy swim
    this._moveTo(this._W * 0.5, this._H * 0.4, 1200, () => {
      this._moveTo(this._W * 0.35, this._H * 0.55, 1000);
    });
    // Auto-complete after speaking finishes (React will handle via onend)
  }

  // ── STEP 5: Done — emit complete ──────────────────────────────────
  _finish() {
    this.cameras.main.fadeOut(500, 0, 10, 40);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.game.events.emit('tutorialComplete');
    });
  }

  // ── PUBLIC: called by React "Next →" button or auto after voice ───
  nextStep() {
    // Kill all running tweens on shark
    this.tweens.killTweensOf(this._shark.sprite);
    // Clear any fish
    this._fishes.forEach(f => { f.destroy(); });
    this._fishes = [];
    // Reset shark position smoothly
    this._shark.sprite.setPosition(this._startX, this._startY);

    switch (this._step) {
      case 1: this._runStep2(); break;
      case 2: this._runStep3(); break;
      case 3: this._runStep4(); break;
      case 4: this._finish(); break;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────
  _emitStep(text) {
    this.game.events.emit('tutorialStep', { step: this._step, text });
  }

  _moveTo(x, y, duration, onComplete) {
    this.tweens.add({
      targets: this._shark.sprite,
      x, y, duration,
      ease: 'Sine.easeInOut',
      onComplete: onComplete || undefined,
    });
  }
}
