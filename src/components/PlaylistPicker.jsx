export default function PlaylistPicker({ playlists, onSelect }) {
  if (!playlists.length) {
    return (
      <div className="screen center-screen">
        <div className="spinner" />
        <p className="loading-text">Loading playlists...</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="top-bar">
        <span className="logo-small">N</span>
        <h2 className="top-bar-title">Pick a Playlist</h2>
      </header>

      <div className="playlist-grid">
        {playlists.map((pl) => {
          const img = pl.images?.[0]?.url;
          return (
            <button
              key={pl.id}
              className="playlist-card"
              onClick={() => onSelect(pl)}
            >
              <div className="playlist-art-wrap">
                {img ? (
                  <img src={img} alt={pl.name} className="playlist-art" />
                ) : (
                  <div className="playlist-art-placeholder">♪</div>
                )}
              </div>
              <span className="playlist-name">{pl.name}</span>
              <span className="playlist-count">
                {pl.tracks?.total ?? '?'} tracks
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
