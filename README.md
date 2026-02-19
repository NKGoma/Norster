# Norster

A Hitster-style music timeline party game that uses **your own Spotify playlists**.

## How to play

1. Open the app on your iPhone and connect your Spotify account.
2. Pick any playlist from your library.
3. Enter player names and choose starting token count (default: 3).
4. Each turn:
   - Draw a card — the song plays secretly in Spotify.
   - Players discuss where it fits on their **physical metal timeline**.
   - Hit **Reveal** to show the year, artist, and title.
   - Mark the placement **Correct** or **Wrong** — score updates automatically.
5. Before revealing, anyone can guess the **exact year** for a bonus token.
6. First player to **10 correct songs** wins and becomes the Norster!

## Physical components (recommended)

- A metal strip per player (their timeline, left = oldest, right = newest)
- Metal discs to write song info on when revealed
- 3 tokens per player to start (skip / challenge)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in Safari on your iPhone (same WiFi), or deploy to any static host (Vercel, Netlify, etc.).

### Spotify Developer setup (one-time)

1. Go to [developer.spotify.com](https://developer.spotify.com) → Dashboard → your app.
2. Add your app's URL as a **Redirect URI** (shown in the app on first launch).
3. Copy your **Client ID** and paste it into the app.

## Tech stack

- React + Vite (PWA)
- Spotify Web API with PKCE auth (no backend needed)
- Opens Spotify app via URI scheme for full-track playback
