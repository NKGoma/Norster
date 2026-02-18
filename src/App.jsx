import { useState, useEffect } from 'react';
import {
  exchangeCodeForToken,
  refreshAccessToken,
  saveTokens,
  loadTokens,
  clearTokens,
  getUserPlaylists,
  getPlaylistTracks,
} from './spotify';
import SetupClient from './components/SetupClient';
import Login from './components/Login';
import PlaylistPicker from './components/PlaylistPicker';
import PlayerSetup from './components/PlayerSetup';
import GameScreen from './components/GameScreen';

// ── View names ────────────────────────────────────────────────────────────
const VIEWS = {
  BOOT: 'boot',
  SETUP_CLIENT: 'setup_client',
  LOGIN: 'login',
  PLAYLISTS: 'playlists',
  PLAYER_SETUP: 'player_setup',
  GAME: 'game',
  ERROR: 'error',
};

export default function App() {
  const [view, setView] = useState(VIEWS.BOOT);
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [gameSetup, setGameSetup] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState('');

  // ── Boot: handle OAuth callback or restore session ────────────────────

  useEffect(() => {
    const storedClientId = localStorage.getItem('norster_client_id') || '';
    setClientId(storedClientId);

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Arrived from Spotify OAuth redirect
      window.history.replaceState({}, '', '/');

      if (!storedClientId) {
        setView(VIEWS.SETUP_CLIENT);
        return;
      }

      setLoading('Connecting to Spotify...');
      exchangeCodeForToken(storedClientId, code)
        .then((data) => {
          saveTokens(data);
          setAccessToken(data.access_token);
          setView(VIEWS.PLAYLISTS);
        })
        .catch((err) => {
          setErrorMsg(`Auth failed: ${err.message}`);
          setView(VIEWS.ERROR);
        })
        .finally(() => setLoading(''));
      return;
    }

    // No OAuth code — check stored token
    if (!storedClientId) {
      setView(VIEWS.SETUP_CLIENT);
      return;
    }

    const { token, refreshToken, expiry } = loadTokens();

    if (token && Date.now() < expiry - 30_000) {
      // Valid token
      setAccessToken(token);
      setView(VIEWS.PLAYLISTS);
      return;
    }

    if (refreshToken) {
      // Try to refresh
      setLoading('Refreshing session...');
      refreshAccessToken(storedClientId, refreshToken)
        .then((data) => {
          saveTokens(data);
          setAccessToken(data.access_token);
          setView(VIEWS.PLAYLISTS);
        })
        .catch(() => {
          clearTokens();
          setView(VIEWS.LOGIN);
        })
        .finally(() => setLoading(''));
      return;
    }

    setView(VIEWS.LOGIN);
  }, []); // run once on mount

  // ── Load playlists whenever we land on PLAYLISTS view ────────────────

  useEffect(() => {
    if (view !== VIEWS.PLAYLISTS || !accessToken) return;

    setLoading('Loading playlists...');
    getUserPlaylists(accessToken)
      .then((list) => {
        setPlaylists(list);
        setLoading('');
      })
      .catch((err) => {
        setErrorMsg(`Could not load playlists: ${err.message}`);
        setView(VIEWS.ERROR);
        setLoading('');
      });
  }, [view, accessToken]);

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleClientId(id) {
    localStorage.setItem('norster_client_id', id);
    setClientId(id);
    setView(VIEWS.LOGIN);
  }

  async function handlePlaylistSelect(playlist) {
    setSelectedPlaylist(playlist);
    setLoading(`Loading "${playlist.name}"...`);
    try {
      const t = await getPlaylistTracks(accessToken, playlist.id);
      setTracks(t);
      setView(VIEWS.PLAYER_SETUP);
    } catch (err) {
      setErrorMsg(`Could not load tracks: ${err.message}`);
      setView(VIEWS.ERROR);
    } finally {
      setLoading('');
    }
  }

  function handleGameStart(setup) {
    setGameSetup(setup);
    setView(VIEWS.GAME);
  }

  function handleNewGame() {
    setSelectedPlaylist(null);
    setTracks([]);
    setGameSetup(null);
    setView(VIEWS.PLAYLISTS);
  }

  function handleDisconnect() {
    clearTokens();
    setAccessToken(null);
    setView(VIEWS.LOGIN);
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="screen center-screen">
        <div className="spinner" />
        <p className="loading-text">{loading}</p>
      </div>
    );
  }

  switch (view) {
    case VIEWS.BOOT:
      return (
        <div className="screen center-screen">
          <div className="logo-large">N</div>
        </div>
      );

    case VIEWS.SETUP_CLIENT:
      return <SetupClient onSubmit={handleClientId} />;

    case VIEWS.LOGIN:
      return (
        <Login
          clientId={clientId}
          onChangeClient={() => setView(VIEWS.SETUP_CLIENT)}
        />
      );

    case VIEWS.PLAYLISTS:
      return (
        <PlaylistPicker
          playlists={playlists}
          onSelect={handlePlaylistSelect}
          onDisconnect={handleDisconnect}
        />
      );

    case VIEWS.PLAYER_SETUP:
      return (
        <PlayerSetup
          playlist={selectedPlaylist}
          onStart={handleGameStart}
          onBack={() => setView(VIEWS.PLAYLISTS)}
        />
      );

    case VIEWS.GAME:
      return (
        <GameScreen
          tracks={tracks}
          setup={gameSetup}
          playlist={selectedPlaylist}
          onNewGame={handleNewGame}
        />
      );

    case VIEWS.ERROR:
      return (
        <div className="screen center-screen">
          <div className="error-card">
            <p className="error-title">Something went wrong</p>
            <p className="error-msg">{errorMsg}</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setErrorMsg('');
                setView(VIEWS.LOGIN);
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
