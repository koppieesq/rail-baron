import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useGame } from './GameContext';
import './game.css';

export default function LoginScreen() {
  const { login } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSuccess = async ({ credential }) => {
    setLoading(true);
    setError('');
    try {
      await login(credential);
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rb-screen rb-screen--center">
      <div className="rb-card rb-login-card">
        <h2 className="rb-card-title">Sign In</h2>
        <p className="rb-card-subtitle">Use your Google account to play Rail Baron.</p>
        {error && <p className="rb-error">{error}</p>}
        {loading
          ? <p className="rb-muted">Signing in…</p>
          : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google sign-in was cancelled.')}
            />
          )
        }
      </div>
    </div>
  );
}
