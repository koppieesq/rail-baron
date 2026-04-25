import { useEffect, useState } from 'react';
import { useGame } from './GameContext';
import './game.css';

// ---- Waiting Room (while status === 'waiting') ----------------------------
function WaitingRoom({ state }) {
  const { myUid, startGame, leaveGame } = useGame();
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState('');

  const creator = state.players?.[0];
  const isCreator = creator?.uid === myUid;
  const canStart  = state.players?.length >= 1;

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try { await startGame(); }
    catch (e) { setError(e.message); setStarting(false); }
  };

  return (
    <div className="rb-screen rb-screen--center">
      <div className="rb-card">
        <h2 className="rb-card-title">Waiting for Players</h2>
        <p className="rb-card-subtitle">
          Join code: <strong className="rb-join-code">{state.join_code}</strong>
        </p>

        <ul className="rb-player-list">
          {state.players?.map((p, i) => (
            <li key={p.uid} className="rb-player-list-item">
              <span className="rb-player-dot" style={{ background: ['#1e88e5','#e53935','#43a047','#fb8c00','#8e24aa','#00acc1'][i] }} />
              {p.username ?? `Player ${i + 1}`}
              {p.uid === myUid ? ' (you)' : ''}
              {i === 0 ? ' — host' : ''}
            </li>
          ))}
        </ul>

        {error && <p className="rb-error">{error}</p>}

        <div className="rb-btn-row">
          {isCreator && (
            <button
              className="rb-btn rb-btn--primary"
              onClick={handleStart}
              disabled={starting || !canStart}
            >
              {starting ? 'Starting…' : 'Start Game'}
            </button>
          )}
          {!isCreator && <p className="rb-muted">Waiting for the host to start…</p>}
          <button className="rb-btn rb-btn--ghost" onClick={leaveGame}>Leave</button>
        </div>
      </div>
    </div>
  );
}

// ---- Open Games Browser ---------------------------------------------------
function OpenGamesBrowser({ onBack }) {
  const { joinGame, listOpenGames } = useGame();
  const [games, setGames]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null); // join_code being joined
  const [error, setError]     = useState('');

  const refresh = async () => {
    try {
      const list = await listOpenGames();
      setGames(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async (joinCode) => {
    setJoining(joinCode);
    setError('');
    try {
      await joinGame(joinCode);
    } catch (e) {
      setError(e.message);
      setJoining(null);
    }
  };

  return (
    <div className="rb-screen rb-screen--center">
      <div className="rb-card rb-card--wide">
        <h2 className="rb-card-title">Open Games</h2>

        {error && <p className="rb-error">{error}</p>}

        {loading ? (
          <p className="rb-muted">Loading…</p>
        ) : games.length === 0 ? (
          <p className="rb-muted">No open games right now. Create one!</p>
        ) : (
          <table className="rb-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Players</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id}>
                  <td><span className="rb-join-code">{g.join_code}</span></td>
                  <td>{g.player_count} / {g.max_players}</td>
                  <td>
                    <button
                      className="rb-btn rb-btn--secondary rb-btn--sm"
                      onClick={() => handleJoin(g.join_code)}
                      disabled={joining !== null}
                    >
                      {joining === g.join_code ? 'Joining…' : 'Join'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="rb-btn-row" style={{ marginTop: '1rem' }}>
          <button className="rb-btn rb-btn--ghost" onClick={onBack}>Back</button>
        </div>
      </div>
    </div>
  );
}

// ---- Lobby (create or join) -----------------------------------------------
export default function LobbyScreen() {
  const { gameState, createGame, joinGame, logout } = useGame();

  const [mode, setMode]         = useState('choose'); // 'choose' | 'create' | 'join' | 'browse'
  const [maxPlayers, setMax]    = useState(4);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // If we're already in a waiting-room game, show the waiting room.
  if (gameState?.status === 'waiting') return <WaitingRoom state={gameState} />;

  if (mode === 'browse') return <OpenGamesBrowser onBack={() => setMode('choose')} />;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await createGame(maxPlayers); }
    catch (err) { setError(err.message); setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await joinGame(joinCode); }
    catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="rb-screen rb-screen--center">
      <div className="rb-card">
        <h2 className="rb-card-title">Rail Baron</h2>
        <p className="rb-card-subtitle">Start a new game or join an existing one.</p>

        {mode === 'choose' && (
          <div className="rb-btn-col">
            <button className="rb-btn rb-btn--primary" onClick={() => setMode('create')}>Create Game</button>
            <button className="rb-btn rb-btn--secondary" onClick={() => setMode('browse')}>Browse Open Games</button>
            <button className="rb-btn rb-btn--secondary" onClick={() => setMode('join')}>Join by Code</button>
            <button className="rb-btn rb-btn--ghost" onClick={logout}>Sign Out</button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="rb-form">
            <label className="rb-label">
              Max Players
              <select className="rb-input" value={maxPlayers} onChange={e => setMax(+e.target.value)}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {error && <p className="rb-error">{error}</p>}
            <div className="rb-btn-row">
              <button className="rb-btn rb-btn--primary" type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create'}
              </button>
              <button className="rb-btn rb-btn--ghost" type="button" onClick={() => setMode('choose')}>Back</button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="rb-form">
            <label className="rb-label">
              Join Code
              <input
                className="rb-input rb-input--code"
                type="text"
                maxLength={6}
                placeholder="XXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                disabled={loading}
                required
              />
            </label>
            {error && <p className="rb-error">{error}</p>}
            <div className="rb-btn-row">
              <button className="rb-btn rb-btn--primary" type="submit" disabled={loading}>
                {loading ? 'Joining…' : 'Join'}
              </button>
              <button className="rb-btn rb-btn--ghost" type="button" onClick={() => setMode('choose')}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
