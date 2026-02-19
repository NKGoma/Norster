import { useState, useCallback } from 'react';
import { getTrackYear, getAlbumArt, getArtists, openInSpotify } from '../spotify';

// ── Helpers ───────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WIN_SCORE = 10;

// ── Main component ────────────────────────────────────────────────────────

export default function GameScreen({ tracks, setup, playlist, onNewGame }) {
  const { players: playerNames, tokens: startingTokens } = setup;

  const [queue, setQueue] = useState(() => shuffle(tracks));
  const [usedTracks, setUsedTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);

  // phase: 'idle' | 'playing' | 'revealed'
  const [phase, setPhase] = useState('idle');

  const [players, setPlayers] = useState(() =>
    playerNames.map((name) => ({ name, score: 0, tokens: startingTokens }))
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [winner, setWinner] = useState(null);

  // Year-guess state (shown after reveal)
  const [yearInput, setYearInput] = useState('');
  const [yearResult, setYearResult] = useState(null); // null | 'correct' | 'wrong'
  const [bonusPlayer, setBonusPlayer] = useState(null); // index of player who guessed

  // ── Actions ─────────────────────────────────────────────────────────────

  const drawCard = useCallback(() => {
    let nextQueue = queue;
    let nextUsed = usedTracks;

    if (nextQueue.length === 0) {
      // Reshuffle all used tracks back in
      nextQueue = shuffle(nextUsed);
      nextUsed = [];
    }

    const [track, ...rest] = nextQueue;
    setQueue(rest);
    setUsedTracks(nextUsed);
    setCurrentTrack(track);
    setPhase('playing');
    setYearInput('');
    setYearResult(null);
    setBonusPlayer(null);
  }, [queue, usedTracks]);

  const handleReveal = () => {
    setUsedTracks((prev) => [...prev, currentTrack]);
    setPhase('revealed');
  };

  const handleSkip = () => {
    // Costs 1 token from the active player
    const updated = players.map((p, i) =>
      i === activeIdx ? { ...p, tokens: Math.max(0, p.tokens - 1) } : p
    );
    setPlayers(updated);
    drawCard();
  };

  const handleYearCheck = () => {
    const correct = getTrackYear(currentTrack);
    const idx = Number(bonusPlayer ?? activeIdx);
    if (yearInput.trim() === correct) {
      setYearResult('correct');
      // Bonus token for the player who guessed
      setPlayers((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, tokens: p.tokens + 1 } : p))
      );
    } else {
      setYearResult('wrong');
    }
  };

  const handleResult = (correct) => {
    const updated = players.map((p, i) => {
      if (i !== activeIdx) return p;
      const newScore = correct ? p.score + 1 : p.score;
      return { ...p, score: newScore };
    });

    // Check win condition
    if (correct && updated[activeIdx].score >= WIN_SCORE) {
      setWinner(updated[activeIdx].name);
      setPlayers(updated);
      return;
    }

    setPlayers(updated);
    setActiveIdx((prev) => (prev + 1) % players.length);
    setPhase('idle');
    setCurrentTrack(null);
  };

  const adjustTokens = (playerIdx, delta) => {
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === playerIdx ? { ...p, tokens: Math.max(0, p.tokens + delta) } : p
      )
    );
  };

  // ── Winner screen ────────────────────────────────────────────────────────

  if (winner) {
    return (
      <div className="screen center-screen winner-screen">
        <div className="winner-inner">
          <div className="winner-trophy">🏆</div>
          <div className="winner-label">NORSTER!</div>
          <div className="winner-name">{winner}</div>
          <p className="winner-sub">First to {WIN_SCORE} songs — you win!</p>
          <button className="btn btn-primary" onClick={onNewGame}>
            New Game
          </button>
        </div>
      </div>
    );
  }

  // ── Game UI ──────────────────────────────────────────────────────────────

  const activePlayer = players[activeIdx];
  const year = currentTrack ? getTrackYear(currentTrack) : null;
  const albumArt = currentTrack ? getAlbumArt(currentTrack) : null;

  return (
    <div className="screen game-screen">
      {/* Header */}
      <header className="game-header">
        <span className="logo-small">N</span>
        <span className="game-playlist-name">{playlist?.name}</span>
        <button className="btn-icon menu-btn" onClick={onNewGame} title="New game">
          ↩
        </button>
      </header>

      {/* Active player banner */}
      <div className="turn-banner">
        <span className="turn-arrow">▶</span>
        <span className="turn-name">{activePlayer.name}</span>
        <span className="turn-tokens">{activePlayer.tokens} tok</span>
      </div>

      {/* ── Card area ── */}
      <div className="card-area">

        {/* IDLE: waiting to draw */}
        {phase === 'idle' && (
          <div className="card card-idle">
            <div className="card-disc">♪</div>
            <button className="btn btn-draw" onClick={drawCard}>
              Draw Card
            </button>
          </div>
        )}

        {/* PLAYING: mystery mode */}
        {phase === 'playing' && currentTrack && (
          <div className="card card-mystery">
            <div className="mystery-disc">?</div>
            <p className="mystery-hint">Listen and place it on your timeline</p>

            <button
              className="btn btn-spotify"
              onClick={() => openInSpotify(currentTrack.id)}
            >
              <SpotifyMark /> Play in Spotify
            </button>

            <button className="btn btn-reveal" onClick={handleReveal}>
              Reveal
            </button>

            {activePlayer.tokens > 0 && (
              <button className="btn btn-skip" onClick={handleSkip}>
                Skip — costs 1 token ({activePlayer.tokens} left)
              </button>
            )}
          </div>
        )}

        {/* REVEALED: show song info + scoring */}
        {phase === 'revealed' && currentTrack && (
          <div className="card card-revealed">
            {albumArt && (
              <img src={albumArt} alt="Album art" className="album-art" />
            )}

            <div className="reveal-year">{year}</div>
            <div className="reveal-title">{currentTrack.name}</div>
            <div className="reveal-artist">{getArtists(currentTrack)}</div>
            <div className="reveal-album">{currentTrack.album.name}</div>

            {/* Year-guess bonus */}
            <div className="year-bonus-section">
              <p className="year-bonus-label">Year bonus — who guessed it?</p>
              <div className="year-bonus-row">
                <select
                  className="select-player"
                  value={bonusPlayer ?? activeIdx}
                  onChange={(e) => setBonusPlayer(Number(e.target.value))}
                >
                  {players.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input-year"
                  placeholder="Year"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  min="1900"
                  max="2099"
                />
                <button
                  className="btn btn-check"
                  onClick={handleYearCheck}
                  disabled={!yearInput || yearResult !== null}
                >
                  Check
                </button>
              </div>
              {yearResult === 'correct' && (
                <p className="year-result result-correct">
                  Correct! {players[Number(bonusPlayer ?? activeIdx)].name} gets a bonus token!
                </p>
              )}
              {yearResult === 'wrong' && (
                <p className="year-result result-wrong">
                  Nope! The year is <strong>{year}</strong>.
                </p>
              )}
            </div>

            {/* Placement result */}
            <div className="placement-section">
              <p className="placement-label">
                Did <strong>{activePlayer.name}</strong> place it correctly?
              </p>
              <div className="placement-btns">
                <button className="btn btn-correct" onClick={() => handleResult(true)}>
                  Correct ✓
                </button>
                <button className="btn btn-wrong" onClick={() => handleResult(false)}>
                  Wrong ✗
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Scoreboard ── */}
      <div className="scoreboard">
        {players.map((player, idx) => (
          <div
            key={player.name}
            className={`score-row ${idx === activeIdx ? 'score-row-active' : ''}`}
          >
            <span className="score-name">{player.name}</span>

            <div className="score-tokens">
              <button
                className="adj-btn"
                onClick={() => adjustTokens(idx, -1)}
                aria-label="Remove token"
              >
                −
              </button>
              <span className="score-tokens-count">{player.tokens}</span>
              <button
                className="adj-btn"
                onClick={() => adjustTokens(idx, 1)}
                aria-label="Add token"
              >
                +
              </button>
              <span className="score-tokens-label">tok</span>
            </div>

            <div className="score-cards">
              <span className="score-num">{player.score}</span>
              <span className="score-denom">/{WIN_SCORE}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpotifyMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
