/**
 * Shark.js
 * Animated shark that cycles through 24 sprite frames (baby shark animation).
 * No shadow. Grows from scale 0.22 → 0.75 over 9 correct bites.
 */

const TOTAL_FRAMES = 24;
const FRAME_DURATION_MS = 60; // ~16 fps animation

export default class Shark {
  // Scale range: starts tiny, grows to 0.75 at score=9
  static MIN_SCALE = 0.40;
  static MAX_SCALE = 1.1;

  constructor(scene) {
    this.scene = scene;
    this.score = 0;
    this.shaking = false;
    this._targetScale = Shark.MIN_SCALE;

    // Frame animation state
    this._frameIndex = 0;     // current frame (0-based)
    this._frameElapsed = 0;   // ms elapsed since last frame switch

    const cx = scene.scale.width  * 0.20;
    const cy = scene.scale.height * 0.50;

    // ── Sprite – starts on frame 001 ─────────────────────────────
    this.sprite = scene.physics.add.sprite(cx, cy, 'shark_frame_001');
    this.sprite.setScale(Shark.MIN_SCALE);
    this.sprite.setDepth(20);
    this.sprite.body.setAllowGravity(false);

    // ── Physics Circle for Face/Mouth ─────────────────────────────
    this._baseRadius = 150;
    this._setBodyCircle();

    // ── Bubble particles ─────────────────────────────────────────
    this.particles = scene.add.particles(0, 0, 'bubble', {
      follow: this.sprite,
      followOffset: { x: -40, y: 0 },
      lifespan: 700,
      speed: { min: 15, max: 40 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.5, end: 0 },
      quantity: 1,
      frequency: 130,
      angle: { min: 170, max: 190 },
    });
    this.particles.setDepth(18);
  }

  update(pointer, delta) {
    if (!this.sprite.active) return;

    // ── Mouse follow (lerp) ──────────────────────────────────────
    const tx = Phaser.Math.Clamp(pointer.x, 60, this.scene.scale.width * 0.75);
    const ty = Phaser.Math.Clamp(pointer.y, 60, this.scene.scale.height - 60);
    this.sprite.x += (tx - this.sprite.x) * 0.1;
    this.sprite.y += (ty - this.sprite.y) * 0.1;

    // ── Smooth scale lerp toward target ─────────────────────────
    const currentScale = this.sprite.scaleX;
    const smoothed = currentScale + (this._targetScale - currentScale) * 0.12;
    this.sprite.setScale(smoothed);

    // ── Frame animation ──────────────────────────────────────────
    const dt = delta ?? 16; // fallback 16ms if delta not provided
    this._frameElapsed += dt;
    if (this._frameElapsed >= FRAME_DURATION_MS) {
      this._frameElapsed -= FRAME_DURATION_MS;
      this._frameIndex = (this._frameIndex + 1) % TOTAL_FRAMES;
      const pad = String(this._frameIndex + 1).padStart(3, '0');
      this.sprite.setTexture(`shark_frame_${pad}`);
    }

    // ── Recompute body circle each frame ──────────────────────────
    this._setBodyCircle();
  }

  eatCorrect() {
    this.score++;
    const progress = Math.min(this.score / 9, 1.0);
    this._targetScale = Shark.MIN_SCALE + (Shark.MAX_SCALE - Shark.MIN_SCALE) * progress;
    this._growPulse();
  }

  eatWrong() {
    if (this._isTingingRed) return;
    this._isTingingRed = true;

    this.sprite.setTint(0xff0000);
    this._shake();

    this.scene.time.delayedCall(1000, () => {
      this.sprite.clearTint();
      this._isTingingRed = false;
    });
  }

  /** Place physics circle to cover the whole face (~68% depth, vertically centered) */
  _setBodyCircle() {
    const rawW = this.sprite.texture.getSourceImage().width;
    const rawH = this.sprite.texture.getSourceImage().height;

    const offX = rawW * 0.68 - this._baseRadius;
    const offY = rawH * 0.50 - this._baseRadius;

    this.sprite.body.setCircle(this._baseRadius, offX, offY);
  }

  /** Smoother pop animation on eat */
  _growPulse() {
    const s = this._targetScale;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: s * 1.1,
      scaleY: s * 1.1,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  _shake() {
    if (this.shaking) return;
    this.shaking = true;
    const ox = this.sprite.x;
    this.scene.tweens.add({
      targets: this.sprite,
      x: ox + 10,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.sprite.x = ox;
        this.shaking = false;
      },
    });
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  destroy() {
    this.particles?.destroy();
    this.sprite?.destroy();
  }
}
