/**
 * GameCanvas.jsx
 * Mounts the Phaser 3 game instance inside a React component.
 * Bridges Phaser events → React state via game.events.
 */

import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import GameScene from '../game/GameScene';

const TARGET_SCORE = 9;

export default function GameCanvas({ onStateChange, onLevelComplete }) {
  const containerRef = useRef(null);
  const gameRef      = useRef(null);

  // ─── Build Phaser Config ───────────────────────────────────────────────
  const createGame = useCallback(() => {
    if (gameRef.current) return;

    const config = {
      type:   Phaser.AUTO,
      parent: containerRef.current,
      width:  window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#0a2040',
      physics: {
        default: 'arcade',
        arcade:  { gravity: { y: 0 }, debug: false },
      },
      scene: [GameScene],
      scale: {
        mode:            Phaser.Scale.RESIZE,
        autoCenter:      Phaser.Scale.CENTER_BOTH,
        width:           '100%',
        height:          '100%',
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Listen for events from the scene
    game.events.on('gameState', (data) => {
      onStateChange(data);
    });

    game.events.on('levelComplete', (data) => {
      onLevelComplete(data);
    });

    return game;
  }, [onStateChange, onLevelComplete]);

  // ─── Mount / Unmount ───────────────────────────────────────────────────
  useEffect(() => {
    createGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // only once

  // ─── Expose helpers ───────────────────────────────────────────────────
  GameCanvas.restart = () => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.getScene('GameScene');
    if (scene) scene.restartGame();
  };

  GameCanvas.pause = () => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.getScene('GameScene');
    if (scene) scene.pauseGame();
  };

  GameCanvas.resume = () => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.getScene('GameScene');
    if (scene) scene.resumeGame();
  };

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
