import { useState } from 'react';

export default function SetupClient({ onSubmit }) {
  const [clientId, setClientId] = useState('');
  const redirectUri = window.location.origin;

  function handleSubmit(e) {
    e.preventDefault();
    const id = clientId.trim();
    if (id.length < 20) return;
    onSubmit(id);
  }

  return (
    <div className="screen center-screen">
      <div className="setup-card">
        <div className="logo-large">N</div>
        <h1 className="title">Norster</h1>
        <p className="subtitle">First, connect your Spotify app.</p>

        <div className="info-box">
          <p className="info-title">One-time setup</p>
          <ol className="info-steps">
            <li>
              Go to{' '}
              <strong>developer.spotify.com</strong> → Dashboard → your app
            </li>
            <li>
              Under <em>Redirect URIs</em>, add:
              <br />
              <code className="uri-code">{redirectUri}</code>
            </li>
            <li>Copy your <strong>Client ID</strong> and paste it below.</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <input
            className="text-input"
            type="text"
            placeholder="Spotify Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={clientId.trim().length < 20}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
