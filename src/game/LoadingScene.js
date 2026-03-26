/**
 * LoadingScene.js
 * Phaser 3 boot / loading screen.
 * Shows baby_shark image + animated progress bar, then starts GameScene.
 */
import Phaser from 'phaser';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Ocean background (gradient drawn manually) ──────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x001a3a, 0x001a3a, 0x003366, 0x003366, 1);
    bg.fillRect(0, 0, W, H);

    // ── Bubble particles for atmosphere ─────────────────────────────
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(20, H - 20);
      const r = Phaser.Math.Between(4, 14);
      const circle = this.add.graphics();
      circle.lineStyle(1.5, 0x88ccff, 0.4);
      circle.strokeCircle(x, y, r);
    }

    // ── Baby shark image (already placed in public via HTML img preload) ─
    // We load it here as a Phaser texture for rendering on canvas
    this.load.image('loading_shark', '/assets/baby_shark.png');

    // Load ALL game assets here (so GameScene doesn't re-load)
    this.load.image('background_water',  '/assets/background_water.png');
    this.load.image('land_with_sand',    '/assets/sand_plant_land.png');
    this.load.image('baby_shark',        '/assets/baby_shark.png');
    this.load.image('medium_shark',      '/assets/medium_shark.png');
    this.load.image('fully_grown_shark', '/assets/fully_grown_shark.png');
    this.load.image('small_fish',        '/assets/small_fish.png');
    this.load.image('bubble',            '/assets/bubble.png');
    this.load.audio('eat_sound',         '/assets/eat.wav');
    this.load.audio('wrong_sound',       '/assets/wrong.wav');
    this.load.audio('win_sound',         '/assets/level_complete.wav');
    this.load.audio('bg_music',          '/assets/background_water_music.wav');

    // ── Title text ──────────────────────────────────────────────────
    this.add.text(W / 2, H * 0.12, '🦈 SHARK NUMBER HUNT', {
      fontSize: Math.round(W * 0.048) + 'px',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#003366',
      strokeThickness: 6,
      shadow: { offsetX: 2, offsetY: 2, color: '#00aaff', blur: 10, fill: true },
    }).setOrigin(0.5).setDepth(10);

    // ── Sub-title ───────────────────────────────────────────────────
    this.add.text(W / 2, H * 0.20, 'Loading ocean adventure…', {
      fontSize: Math.round(W * 0.022) + 'px',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      color: '#88ccff',
      alpha: 0.85,
    }).setOrigin(0.5).setDepth(10);

    // ── Progress bar ────────────────────────────────────────────────
    const barW = Math.min(400, W * 0.6);
    const barH = 20;
    const barX = W / 2 - barW / 2;
    const barY = H * 0.82;

    const barBg = this.add.graphics().setDepth(10);
    barBg.fillStyle(0x001a3a, 0.8);
    barBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 12);

    const barFill = this.add.graphics().setDepth(11);

    this.add.text(W / 2, barY + 34, 'Loading…', {
      fontSize: '16px',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      color: '#aaddff',
    }).setOrigin(0.5).setDepth(10);

    // ── Progress event ──────────────────────────────────────────────
    this.load.on('progress', (value) => {
      barFill.clear();
      barFill.fillStyle(0x00aaff, 1);
      barFill.fillRoundedRect(barX, barY, barW * value, barH, 10);
      // Gloss sheen on bar
      barFill.fillStyle(0xffffff, 0.18);
      barFill.fillRoundedRect(barX, barY, barW * value, barH / 2, 10);
    });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Show the shark image ────────────────────────────────────────
    const sharkImg = this.add.image(W / 2, H * 0.50, 'loading_shark');
    const targetW  = Math.min(W * 0.45, 320);
    sharkImg.setDisplaySize(targetW, targetW * (sharkImg.height / sharkImg.width));
    sharkImg.setDepth(12);
    sharkImg.setAlpha(0);

    // Fade in shark
    this.tweens.add({
      targets: sharkImg,
      alpha: 1,
      duration: 600,
      ease: 'Sine.easeOut',
    });

    // Gentle float
    this.tweens.add({
      targets: sharkImg,
      y: H * 0.50 - 14,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Bubble pop particles ────────────────────────────────────────
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 220, () => {
        const bx = Phaser.Math.Between(W * 0.2, W * 0.8);
        const by = Phaser.Math.Between(H * 0.3, H * 0.75);
        const g = this.add.graphics().setDepth(13);
        g.lineStyle(1.5, 0x88ccff, 0.6);
        g.strokeCircle(0, 0, Phaser.Math.Between(5, 12));
        g.x = bx; g.y = by;
        this.tweens.add({ targets: g, y: by - 60, alpha: 0, duration: 900, ease: 'Sine.easeIn', onComplete: () => g.destroy() });
      });
    }

    // ── Transition to GameScene after brief pause ───────────────────
    this.time.delayedCall(900, () => {
      // Notify React that loading is done
      this.game.events.emit('loadingComplete');

      this.cameras.main.fadeOut(500, 0, 10, 40);
      // We don't start GameScene here anymore; React handles it via Start Screen buttons
    });
  }
}
