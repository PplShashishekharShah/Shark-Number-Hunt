/**
 * Shark.js
 * Single-texture (baby_shark.png) shark that grows from scale 0.22 → 0.75 max.
 * Physics circle is positioned to cover the whole face.
 */

export default class Shark {
  // Scale range: starts tiny, grows to 0.75 at score=9
  static MIN_SCALE = 0.22;
  static MAX_SCALE = 0.75;

  constructor(scene) {
    this.scene = scene;
    this.score = 0;
    this.shaking = false;
    this._targetScale = Shark.MIN_SCALE; // Used for smooth lerp on growth

    const cx = scene.scale.width  * 0.20;
    const cy = scene.scale.height * 0.50;

    // ── Sprite ───────────────────────────────────────────────────
    this.sprite = scene.physics.add.sprite(cx, cy, 'baby_shark');
    this.sprite.setScale(Shark.MIN_SCALE);
    this.sprite.setDepth(20);
    this.sprite.body.setAllowGravity(false);

    // ── Physics Circle for Face/Mouth ─────────────────────────────
    // Large radius to cover the face area (per user request)
    this._baseRadius = 150; 
    this._setBodyCircle();

    // ── Shadow ───────────────────────────────────────────────────
    this.shadow = scene.add.image(cx, cy, 'baby_shark');
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(0.25);
    this.shadow.setDepth(19);
    this.shadow.setScale(Shark.MIN_SCALE);

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

  update(pointer) {
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
    this.shadow.setScale(smoothed);

    // ── Shadow slightly behind and below ────────────────────────
    this.shadow.x = this.sprite.x - 14;
    this.shadow.y = this.sprite.y + 12;

    // ── Recompute body circle each frame (face-pinned and scaled) ──────────
    this._setBodyCircle();
  }

  eatCorrect() {
    this.score++;
    // Compute new _targetScale so lerp in update() smoothly grows toward it
    const progress = Math.min(this.score / 9, 1.0);
    this._targetScale = Shark.MIN_SCALE + (Shark.MAX_SCALE - Shark.MIN_SCALE) * progress;
    this._growPulse();
  }

  eatWrong() {
    this._shake();
  }

  /** Place physics circle to cover the whole face (~68% depth, vertically centered) */
  _setBodyCircle() {
    const rawW = this.sprite.texture.getSourceImage().width;
    const rawH = this.sprite.texture.getSourceImage().height;
    
    // Position center at 68% of width (face region)
    const offX = rawW * 0.68 - this._baseRadius;
    const offY = rawH * 0.50 - this._baseRadius;
    
    this.sprite.body.setCircle(this._baseRadius, offX, offY);
  }

  /** Smoother pop animation on eat */
  _growPulse() {
    const s = this._targetScale;
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      scaleX: s * 1.1,
      scaleY: s * 1.1,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Smooth lerp in update() handles the final settle
      },
    });
  }

  _shake() {
    if (this.shaking) return;
    this.shaking = true;
    const ox = this.sprite.x;
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
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
    this.shadow?.destroy();
    this.sprite?.destroy();
  }
}
