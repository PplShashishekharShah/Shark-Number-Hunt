/**
 * App.jsx
 * Root React component.
 * Renders:
 *  – GameCanvas (Phaser mount point)
 *  – HUD overlay (rule + score)
 *  – Progress bar
 *  – Level Complete panel
 *  – Star cursor
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { RULES } from './utils/numberUtils';

const TARGET = 9;

export default function App() {
  const [gameState,    setGameState]    = useState(null);
  const [levelDone,    setLevelDone]    = useState(false);
  const [isPaused,     setIsPaused]     = useState(false);
  const [cursorPos,    setCursorPos]    = useState({ x: -100, y: -100 });

  // ─── Forward events from Phaser ──────────────────────────────────────
  const handleStateChange = useCallback((data) => {
    setGameState(data);
  }, []);

  const handleLevelComplete = useCallback((data) => {
    setLevelDone(true);
    setGameState(prev => ({ ...prev, score: TARGET }));
  }, []);

  // ─── Custom star cursor tracking ─────────────────────────────────────
  useEffect(() => {
    const move = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // ─── HUD Actions ──────────────────────────────────────────────────────
  const handleRestart = () => {
    setLevelDone(false);
    setGameState(null);
    setIsPaused(false);
    GameCanvas.restart();
  };

  const handleTogglePause = () => {
    if (levelDone) return;
    const nextPause = !isPaused;
    setIsPaused(nextPause);
    if (nextPause) GameCanvas.pause();
    else           GameCanvas.resume();
  };

  const score       = gameState?.score    ?? 0;
  const ruleLabel   = gameState?.ruleLabel ?? '';
  const progressPct = Math.min((score / TARGET) * 100, 100);

  return (
    <>
      {/* Phaser canvas */}
      <GameCanvas
        onStateChange={handleStateChange}
        onLevelComplete={handleLevelComplete}
      />

      {/* ── HUD Overlay ── */}
      {gameState && !levelDone && (
        <div className="game-ui">
          <div className="game-header">
            <h1>SHARK NUMBER HUNT</h1>
            <div className="rule-badge">🎯 {ruleLabel}</div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="score-badge shadow-box">
              <div>Collected <span className="score-num">{score}</span> / {TARGET}</div>
              <div style={{ fontSize: '14px', color: '#aac', marginTop: 2 }}>
                Remaining: {TARGET - score}
              </div>
            </div>

            <button className="pause-btn shadow-box" onClick={handleTogglePause}>
              {isPaused ? '▶️' : '⏸️'}
            </button>
          </div>
        </div>
      )}

      {/* ── Paused State Indicator (Subtle) ── */}
      {isPaused && !levelDone && (
        <div className="pause-indicator">
          GAME PAUSED - Click Play to Resume
        </div>
      )}

      {/* Progress bar removed per request */}

      {/* ── Level Complete ── */}
      {levelDone && (
        <div className="level-complete">
          <h1>🎉 Level Complete!</h1>
          <p>You collected all {TARGET} correct fish!</p>
          <button onClick={handleRestart}>Play Again 🦈</button>
        </div>
      )}

      {/* ── Star Cursor ── */}
      <svg
        className="star-cursor"
        style={{ left: cursorPos.x, top: cursorPos.y }}
        viewBox="0 0 24 24"
        fill="gold"
        stroke="#ff8800"
        strokeWidth="1"
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </>
  );
}
