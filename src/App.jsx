/**
 * App.jsx
 * Root React component.
 * Controls:
 *  – Loading screen overlay (while Phaser is loading assets)
 *  – GameCanvas (Phaser mount point)
 *  – HUD overlay (rule + score + level)
 *  – Fun Level Complete panel (with Next Level or Play Again)
 *  – Star cursor
 */

import { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';

const TARGET = 9;

// Level theme configs for level-complete screen
const LEVEL_THEMES = {
  1: { emoji: '🔢', color: '#a78bfa', glow: '#7c3aed', name: 'Prime Master', bg: 'radial-gradient(ellipse at center, #1a0533 0%, #0a0120 100%)' },
  2: { emoji: '🌊', color: '#38bdf8', glow: '#0284c7', name: 'Odd Wave Rider', bg: 'radial-gradient(ellipse at center, #001a3a 0%, #000d1a 100%)' },
  3: { emoji: '✨', color: '#4ade80', glow: '#16a34a', name: 'Even Explorer', bg: 'radial-gradient(ellipse at center, #001a10 0%, #000d08 100%)' },
  4: { emoji: '🏆', color: '#fbbf24', glow: '#d97706', name: 'Composite Champion', bg: 'radial-gradient(ellipse at center, #1a1000 0%, #0d0800 100%)' },
};

export default function App() {
  const [gameState,      setGameState]      = useState(null);
  const [levelDone,      setLevelDone]      = useState(false);
  const [levelData,      setLevelData]      = useState(null);
  const [isPaused,       setIsPaused]       = useState(false);
  const [cursorPos,      setCursorPos]      = useState({ x: -100, y: -100 });
  const [isLoading,      setIsLoading]      = useState(true);
  const [screen,         setScreen]         = useState('loading'); // 'loading' | 'start' | 'tutorial' | 'game'
  const [tutorialStep,   setTutorialStep]   = useState({ step: 0, text: '' });
  const [autoNextTimer,  setAutoNextTimer]  = useState(null);

  // ─── Forward events from Phaser ──────────────────────────────────────
  const handleStateChange = useCallback((data) => {
    setGameState(data);
  }, []);

  const handleLevelComplete = useCallback((data) => {
    setLevelDone(true);
    setLevelData(data);
    setGameState(prev => ({ ...prev, score: TARGET }));
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    setScreen('start');
  }, []);

  const handleTutorialStep = useCallback((data) => {
    setTutorialStep(data); // data contains { step, text }
    if (autoNextTimer) clearTimeout(autoNextTimer);
  }, [autoNextTimer]);

  const handleTutorialStepReady = useCallback((_data) => {
    // We no longer use a fixed timer. 
    // progression is handled by the speak() onEnd callback now.
  }, []);

  const handleTutorialComplete = useCallback(() => {
    if (autoNextTimer) clearTimeout(autoNextTimer);
    setScreen('game');
    GameCanvas.startGame();
  }, [autoNextTimer]);

  const score       = gameState?.score    ?? 0;
  const ruleLabel   = gameState?.ruleLabel ?? '';
  const level       = gameState?.level    ?? levelData?.level ?? 1;
  const totalLevels = gameState?.totalLevels ?? 4;
  const theme       = LEVEL_THEMES[levelData?.level] ?? LEVEL_THEMES[1];

  // ─── Voice Synthesis ──────────────────────────────────────────────
  const speak = (text, onEnd) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (onEnd) {
      utterance.onend = onEnd;
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (screen === 'tutorial' && tutorialStep.step > 0 && tutorialStep.text) {
      // Speak the instruction, then move to next step when done
      speak(tutorialStep.text, () => {
        // Wait a small extra pause for visual breathing room
        const timer = setTimeout(() => {
          GameCanvas.nextTutorialStep();
        }, 800);
        setAutoNextTimer(timer);
      });
    }
  }, [screen, tutorialStep, isLoading]);

  useEffect(() => {
    if (ruleLabel && screen === 'game' && !levelDone) {
      speak(`New goal: ${ruleLabel}`);
    }
  }, [ruleLabel, screen, levelDone]);

  // ─── Custom star cursor ───────────────────────────────────────────────
  useEffect(() => {
    const move = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────
  const handleNextLevel = () => {
    setLevelDone(false);
    setLevelData(null);
    setGameState(null);
    setIsPaused(false);
    GameCanvas.nextLevel();
  };

  const handleRestart = () => {
    setLevelDone(false);
    setLevelData(null);
    setGameState(null);
    setIsPaused(false);
    GameCanvas.restart();
  };

  const handleTogglePause = () => {
    if (levelDone) return;
    const nextPause = !isPaused;
    setIsPaused(nextPause);
    if (nextPause) {
      GameCanvas.pause();
      speak("Game paused");
    } else {
      GameCanvas.resume();
      speak("Game resumed");
    }
  };

  return (
    <>
      {/* Phaser canvas */}
      <GameCanvas
        onStateChange={handleStateChange}
        onLevelComplete={handleLevelComplete}
        onLoadingComplete={handleLoadingComplete}
        onTutorialStep={handleTutorialStep}
        onTutorialStepReady={handleTutorialStepReady}
        onTutorialComplete={handleTutorialComplete}
      />

      {/* ── Start Screen ── */}
      {screen === 'start' && (
        <div className="start-screen-overlay">
          <div className="start-card shadow-box">
            <img src="assets/baby_shark.png" alt="Shark Logo" className="start-logo" />
            <h1 className="start-title">SHARK NUMBER HUNT</h1>
            <p className="start-subtitle">Master the ocean of numbers!</p>
            <div className="start-buttons">
              <button className="start-btn primary" onClick={() => { setScreen('game'); GameCanvas.startGame(); speak("Starting game! Good luck!"); }}>
                Start Game
              </button>
              <button className="start-btn secondary" onClick={() => { setScreen('tutorial'); GameCanvas.startTutorial(); setTutorialStep({ step: 1, text: '' }); }}>
                How to Play
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tutorial Overlay ── */}
      {screen === 'tutorial' && (
        <div className="tutorial-overlay-layout">
          {/* Bubble at top center */}
          <div className="tutorial-bubble-container">
            <div className="tutorial-speech-bubble">
              <p className="tutorial-text">{tutorialStep.text}</p>
            </div>
          </div>

          {/* Buttons at bottom */}
          <div className="tutorial-bottom-bar">
            <button className="tutorial-btn skip" onClick={() => { if (autoNextTimer) clearTimeout(autoNextTimer); setScreen('game'); GameCanvas.startGame(); }}>
              Skip Tutorial
            </button>
            {tutorialStep.step < 4 ? (
              <button className="tutorial-btn next" onClick={() => { if (autoNextTimer) clearTimeout(autoNextTimer); GameCanvas.nextTutorialStep(); }}>
                Next →
              </button>
            ) : (
              <button className="tutorial-btn next" onClick={() => { if (autoNextTimer) clearTimeout(autoNextTimer); setScreen('game'); GameCanvas.startGame(); }}>
                Start Now!
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Loading Screen ── */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <img
              src="assets/baby_shark.png"
              alt="Baby Shark"
              className="loading-shark-img"
            />
            <h1 className="loading-title">🦈 SHARK NUMBER HUNT</h1>
            <p className="loading-subtitle">Dive into the ocean adventure!</p>
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}

      {/* ── HUD Overlay ── */}
      {gameState && !levelDone && !isLoading && (
        <div className="game-ui">
          <div className="game-header centered-header">
            <h1>SHARK NUMBER HUNT</h1>
            <div className="rule-badge highlight-heading">🎯 {ruleLabel}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div className="level-indicator">
              {Array.from({ length: totalLevels }, (_, i) => (
                <div
                  key={i}
                  className={`level-pip ${i + 1 < level ? 'done' : i + 1 === level ? 'active' : ''}`}
                />
              ))}
            </div>
            <div style={{ color: '#ffd700', fontSize: '13px', fontWeight: 700, textShadow: '0 0 8px #ff8800' }}>
              Level {level} / {totalLevels}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div className="score-badge shadow-box">
              <div>Collected <span className="score-num">{score}</span> / {TARGET}</div>
              <div style={{ fontSize: '12px', color: '#aac', marginTop: 1 }}>
                Remaining: {TARGET - score}
              </div>
            </div>
            <button className="pause-btn shadow-box" onClick={handleTogglePause}>
              {isPaused ? '▶️' : '⏸️'}
            </button>
          </div>
        </div>
      )}

      {/* ── Paused Indicator ── */}
      {isPaused && !levelDone && (
        <div className="pause-indicator">
          GAME PAUSED – Click ▶️ to Resume
        </div>
      )}

      {/* ── Fun Level Complete Screen ── */}
      {levelDone && levelData && (
        <div className="level-complete-overlay" style={{ background: theme.bg }}>
          {/* Floating bubbles animation */}
          <div className="lc-bubbles">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="lc-bubble" style={{ '--delay': `${i * 0.3}s`, '--x': `${Math.random() * 100}%` }} />
            ))}
          </div>

          <div className="lc-card">
            {/* Stars burst */}
            <div className="lc-stars">
              {['⭐','🌟','✨','⭐','🌟'].map((s, i) => (
                <span key={i} className="lc-star" style={{ '--i': i }}>{s}</span>
              ))}
            </div>

            <div className="lc-emoji" style={{ color: theme.color, textShadow: `0 0 30px ${theme.glow}` }}>
              {theme.emoji}
            </div>

            <h1 className="lc-title" style={{ color: theme.color, textShadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}` }}>
              {levelData.isLastLevel ? '🎊 YOU WIN! 🎊' : `Level ${levelData.level} Complete!`}
            </h1>

            <div className="lc-badge" style={{ borderColor: theme.color, color: theme.color }}>
              {theme.emoji} {theme.name} {theme.emoji}
            </div>

            <p className="lc-rule">
              You mastered: <strong style={{ color: theme.color }}>{levelData.ruleLabel}</strong>
            </p>

            <div className="lc-score-row">
              <div className="lc-fish-count">
                🐟 × {levelData.score}
              </div>
              <div className="lc-score-stars">
                {'⭐'.repeat(Math.min(3, Math.ceil(levelData.score / 3)))}
              </div>
            </div>

            {!levelData.isLastLevel && (
              <p className="lc-next-preview">
                Up next: <strong style={{ color: '#ffffff' }}>Level {levelData.level + 1}</strong>
              </p>
            )}

            <div className="lc-buttons">
              {!levelData.isLastLevel ? (
                <button className="lc-btn lc-btn-primary" onClick={handleNextLevel}
                  style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.glow})` }}>
                  Next Level →
                </button>
              ) : (
                <button className="lc-btn lc-btn-primary" onClick={handleRestart}
                  style={{ background: 'linear-gradient(135deg, #ffd700, #ff8800)' }}>
                  🏆 Play Again!
                </button>
              )}
              <button className="lc-btn lc-btn-secondary" onClick={handleRestart}>
                🔄 Restart
              </button>
            </div>
          </div>
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
