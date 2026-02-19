// ─── Spotify PKCE Auth + Web API helpers ───────────────────────────────────

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// ── PKCE helpers ──────────────────────────────────────────────────────────

function generateVerifier(length = 128) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const rand = crypto.getRandomValues(new Uint8Array(length));
  return rand.reduce((acc, x) => acc + chars[x % chars.length], '');
}

async function generateChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ── Auth flow ─────────────────────────────────────────────────────────────

export async function redirectToSpotifyAuth(clientId) {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  sessionStorage.setItem('pkce_verifier', verifier);

  const redirectUri = window.location.origin;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params}`;
}

export async function exchangeCodeForToken(clientId, code) {
  const verifier = sessionStorage.getItem('pkce_verifier');
  const redirectUri = window.location.origin;

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  return res.json();
}

export async function refreshAccessToken(clientId, refreshToken) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json();
}

// ── Local storage token management ───────────────────────────────────────

export function saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem('norster_access_token', access_token);
  if (refresh_token) localStorage.setItem('norster_refresh_token', refresh_token);
  localStorage.setItem('norster_token_expiry', String(Date.now() + expires_in * 1000));
}

export function loadTokens() {
  const token = localStorage.getItem('norster_access_token');
  const refreshToken = localStorage.getItem('norster_refresh_token');
  const expiry = Number(localStorage.getItem('norster_token_expiry') || 0);
  return { token, refreshToken, expiry };
}

export function clearTokens() {
  localStorage.removeItem('norster_access_token');
  localStorage.removeItem('norster_refresh_token');
  localStorage.removeItem('norster_token_expiry');
}

// ── API calls ─────────────────────────────────────────────────────────────

async function apiFetch(path, token) {
  const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Spotify API ${res.status}: ${path}`);
  return res.json();
}

export async function getUserPlaylists(token) {
  const items = [];
  let url = '/me/playlists?limit=50';
  while (url) {
    const data = await apiFetch(url, token);
    items.push(...data.items.filter(Boolean));
    url = data.next ? data.next.replace(SPOTIFY_API_BASE, '') : null;
  }
  return items;
}

export async function getPlaylistTracks(token, playlistId) {
  const tracks = [];
  let url = `/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,artists(name),album(name,release_date,images))),next`;
  while (url) {
    const data = await apiFetch(url, token);
    const valid = data.items
      .map((i) => i?.track)
      .filter((t) => t?.id && t?.album?.release_date);
    tracks.push(...valid);
    url = data.next ? data.next.replace(SPOTIFY_API_BASE, '') : null;
  }
  return tracks;
}

// ── Track helpers ─────────────────────────────────────────────────────────

export function getTrackYear(track) {
  return (track?.album?.release_date ?? '').slice(0, 4) || '????';
}

export function getAlbumArt(track) {
  return track?.album?.images?.[0]?.url ?? null;
}

export function getArtists(track) {
  return (track?.artists ?? []).map((a) => a.name).join(', ');
}

export function openInSpotify(trackId) {
  // Deep-links into the Spotify app on iOS; falls back gracefully.
  window.location.href = `spotify:track:${trackId}`;
}
