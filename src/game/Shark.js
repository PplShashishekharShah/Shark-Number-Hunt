/**
 * Shark.js
 * Single-texture (baby_shark.png) shark that grows from scale 0.22 → 0.75 max.
 * Physics circle is positioned near the mouth and stays fixed in world space.
 * Debug circle is redrawn each frame — no setScale() on Graphics (that was the bug).
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

    // ── Physics Circle at MOUTH ───────────────────────────────────
    // Radius 32px for slightly larger catch area
    this._hitRadius = 38;
    this._setBodyCircle();

    // ── Debug circle graphics (redrawn every frame at body.center) ──
    this.debugGraphics = scene.add.graphics();
    this.debugGraphics.setDepth(21);

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
    // This makes the growth feel like a gentle swell rather than a snap.
    const currentScale = this.sprite.scaleX;
    const smoothed = currentScale + (this._targetScale - currentScale) * 0.12;
    this.sprite.setScale(smoothed);
    this.shadow.setScale(smoothed);

    // ── Shadow slightly behind and below ────────────────────────
    this.shadow.x = this.sprite.x - 14;
    this.shadow.y = this.sprite.y + 12;

    // ── Recompute body circle each frame (mouth-pinned) ──────────
    this._setBodyCircle();

    // ── Redraw debug circle at physics body.center ───────────────
    // body.center is in world space — just stroke there directly.
    // Do NOT setScale() on the Graphics — that detaches it visually.
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(2, 0x00ff00, 0.25);
    this.debugGraphics.strokeCircle(
      this.sprite.body.center.x,
      this.sprite.body.center.y,
      this._hitRadius
    );
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

  /** Place physics circle at the shark mouth (right side, vertically centred) */
  _setBodyCircle() {
    const r = this._hitRadius;
    const rawW = this.sprite.texture.getSourceImage().width;
    const rawH = this.sprite.texture.getSourceImage().height;
    // 72% from left = near mouth; 50% vertical = centre
    const offX = rawW * 0.72 - r;
    const offY = rawH * 0.50 - r;
    this.sprite.body.setCircle(r, offX, offY);
  }

  /** Pop animation on eat */
  _growPulse() {
    const s = this._targetScale;
    this.scene.tweens.add({
      targets: [this.sprite, this.shadow],
      scaleX: s * 1.2,
      scaleY: s * 1.2,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Let the smooth lerp in update() handle settling back to targetScale
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
    this.debugGraphics?.destroy();
    this.sprite?.destroy();
  }
}
