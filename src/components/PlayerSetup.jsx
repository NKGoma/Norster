import { useState } from 'react';

const DEFAULT_TOKENS = 3;
const MAX_PLAYERS = 10;

export default function PlayerSetup({ playlist, onStart }) {
  const [names, setNames] = useState(['', '']);
  const [tokens, setTokens] = useState(DEFAULT_TOKENS);

  function updateName(idx, val) {
    const updated = [...names];
    updated[idx] = val;
    setNames(updated);
  }

  function addPlayer() {
    if (names.length < MAX_PLAYERS) setNames([...names, '']);
  }

  function removePlayer(idx) {
    if (names.length <= 2) return;
    setNames(names.filter((_, i) => i !== idx));
  }

  function handleStart(e) {
    e.preventDefault();
    const players = names.map((n) => n.trim()).filter(Boolean);
    if (players.length < 2) return;
    onStart({ players, tokens });
  }

  const validPlayers = names.filter((n) => n.trim()).length;

  return (
    <div className="screen">
      <header className="top-bar">
        <span className="logo-small">N</span>
        <div className="top-bar-title-group">
          <h2 className="top-bar-title">Players</h2>
          <span className="top-bar-sub">{playlist?.name}</span>
        </div>
      </header>

      <form className="player-setup-form" onSubmit={handleStart}>
        <section className="setup-section">
          <h3 className="section-label">Player Names</h3>
          {names.map((name, idx) => (
            <div key={idx} className="player-input-row">
              <input
                className="text-input"
                type="text"
                placeholder={`Player ${idx + 1}`}
                value={name}
                onChange={(e) => updateName(idx, e.target.value)}
                maxLength={20}
              />
              {names.length > 2 && (
                <button
                  type="button"
                  className="btn-icon btn-remove"
                  onClick={() => removePlayer(idx)}
                  aria-label="Remove player"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {names.length < MAX_PLAYERS && (
            <button type="button" className="btn btn-ghost add-player-btn" onClick={addPlayer}>
              + Add player
            </button>
          )}
        </section>

        <section className="setup-section">
          <h3 className="section-label">Starting Tokens per Player</h3>
          <div className="token-picker">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`token-option ${tokens === n ? 'selected' : ''}`}
                onClick={() => setTokens(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="hint">Tokens let players skip songs or challenge others.</p>
        </section>

        <button
          className="btn btn-primary start-btn"
          type="submit"
          disabled={validPlayers < 2}
        >
          Start Game
        </button>
      </form>
    </div>
  );
}
