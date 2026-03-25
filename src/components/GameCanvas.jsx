/**
 * GameCanvas.jsx
 * Mounts the Phaser 3 game instance inside a React component.
 * Bridges Phaser events → React state via game.events.
 * Scenes: LoadingScene → GameScene (with level data)
 */

import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import LoadingScene from '../game/LoadingScene';
import GameScene   from '../game/GameScene';

export default function GameCanvas({ onStateChange, onLevelComplete, onLoadingComplete }) {
  const containerRef = useRef(null);
  const gameRef      = useRef(null);

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
      scene: [LoadingScene, GameScene],
      scale: {
        mode:       Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:      '100%',
        height:     '100%',
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on('loadingComplete', () => {
      onLoadingComplete?.();
    });

    game.events.on('gameState', (data) => {
      onStateChange(data);
    });

    game.events.on('levelComplete', (data) => {
      onLevelComplete(data);
    });

    return game;
  }, [onStateChange, onLevelComplete, onLoadingComplete]);

  useEffect(() => {
    createGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // ── Expose helpers ──────────────────────────────────────────────
  GameCanvas.restart = () => {
    const scene = gameRef.current?.scene?.getScene('GameScene');
    scene?.restartGame();
  };

  GameCanvas.nextLevel = () => {
    const scene = gameRef.current?.scene?.getScene('GameScene');
    scene?.goToNextLevel();
  };

  GameCanvas.pause = () => {
    const scene = gameRef.current?.scene?.getScene('GameScene');
    scene?.pauseGame();
  };

  GameCanvas.resume = () => {
    const scene = gameRef.current?.scene?.getScene('GameScene');
    scene?.resumeGame();
  };

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
