/**
 * Fish.js
 * Represents a single number fish moving across the screen.
 * Contains the fish sprite, bubble, and number label.
 */

export default class Fish {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} value  – the number shown on the fish (1-20)
   * @param {boolean} correct – whether this fish matches the current rule
   * @param {number} spawnY – vertical spawn position
   * @param {number} speed  – pixels per second (left movement)
   */
  constructor(scene, value, correct, spawnY, speed = 180) {
    this.scene   = scene;
    this.value   = value;
    this.correct = correct;
    this.active  = true;

    const spawnX = scene.scale.width + 80;

    // Fish sprite – negative scaleX mirrors the image so it faces LEFT
    this.sprite = scene.physics.add.sprite(spawnX, spawnY, 'small_fish');
    this.sprite.setScale(0.35, 0.35);   
    this.sprite.setDepth(15);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setVelocityX(-speed);
    this.sprite.body.setSize(
      this.sprite.width * 0.4,
      this.sprite.height * 0.3
    );

    // Shadow sprite
    this.shadow = scene.add.image(spawnX, spawnY, 'small_fish');
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(0.2);
    this.shadow.setDepth(14);
    this.shadow.setScale(0.35, 0.35);   // match fish mirror

    // Bubble backdrop for number
    this.bubble = scene.add.image(spawnX, spawnY - 55, 'bubble');
    this.bubble.setScale(0.7);
    this.bubble.setDepth(16);
    this.bubble.setAlpha(0.85);

    // Number text
    const fontSize = value >= 10 ? '22px' : '26px';
    this.label = scene.add.text(spawnX, spawnY - 55, String(value), {
      fontSize,
      fontFamily: '"Segoe UI", sans-serif',
      // fontStyle: '',
      color: '#000000',
      stroke: '#001133',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(17);

    // Gentle bob
    scene.tweens.add({
      targets: [this.sprite, this.shadow, this.bubble, this.label],
      y: `+=${8}`,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Sync overlay positions with sprite */
  update() {
    if (!this.active) return;
    this.bubble.x = this.sprite.x;
    this.bubble.y = this.sprite.y - 55;
    this.label.x  = this.sprite.x;
    this.label.y  = this.sprite.y - 55;

    // Sync shadow
    this.shadow.x = this.sprite.x + 6;
    this.shadow.y = this.sprite.y + 6;
  }

  /** Check if the fish has scrolled off screen to the left */
  isOffscreen() {
    return this.sprite.x < -100;
  }

  /** Play a "fish dies/eaten" effect: spin, shrink, fade, and turn gray */
  eatEffect() {
    this.active = false;
    
    // Stop movement
    this.sprite.body.setVelocity(0, 0);
    
    // Turn gray-ish to show "lifeless"
    this.sprite.setTint(0x666666);
    this.label.setAlpha(0); // Hide number immediately
    this.bubble.setAlpha(0);
    this.shadow.setAlpha(0);

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0,
      scaleY: 0,
      rotation: Phaser.Math.DegToRad(360),
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => this.destroy()
    });
  }

  destroy() {
    this.active = false;
    this.sprite?.destroy();
    this.shadow?.destroy();
    this.bubble?.destroy();
    this.label?.destroy();
  }
}
