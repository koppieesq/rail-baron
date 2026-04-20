import { useState } from 'react';
import { useGame } from './GameContext';
import './game.css';

export default function LoginScreen() {
  const { login } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.status === 401 || err.status === 403
        ? 'Invalid username or password.'
        : 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rb-screen rb-screen--center">
      <div className="rb-card rb-login-card">
        <h2 className="rb-card-title">Sign In</h2>
        <p className="rb-card-subtitle">Use your Rail Baron account credentials.</p>

        <form onSubmit={handleSubmit} className="rb-form">
          <label className="rb-label">
            Username
            <input
              className="rb-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          <label className="rb-label">
            Password
            <input
              className="rb-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          {error && <p className="rb-error">{error}</p>}
          <button className="rb-btn rb-btn--primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
