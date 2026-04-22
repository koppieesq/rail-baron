import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';

const GameContext = createContext(null);

const POLL_INTERVAL_MS = 3000;

const PLAYER_COLORS = ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];

export function GameProvider({ children }) {
  const [creds, setCreds]         = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('rb_creds')); } catch { return null; }
  });
  const [gameId, setGameId]       = useState(() => {
    const v = sessionStorage.getItem('rb_game_id');
    return v ? parseInt(v, 10) : null;
  });
  const [gameState, setGameState] = useState(null);
  const [log, setLog]             = useState([]);
  const [error, setError]         = useState(null);
  const pollRef                   = useRef(null);

  const appendLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-99), { ts: Date.now(), msg }]);
  }, []);

  const refreshState = useCallback(async (id = gameId, cr = creds) => {
    if (!id || !cr) return;
    try {
      const res = await api.getState(cr, id);
      setGameState(res.data ?? res);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [gameId, creds]);

  // Polling when we have an active game.
  useEffect(() => {
    if (!gameId || !creds) { clearInterval(pollRef.current); return; }
    clearInterval(pollRef.current);
    refreshState(gameId, creds);
    pollRef.current = setInterval(() => refreshState(gameId, creds), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [gameId, creds, refreshState]);

  // ---- Auth ----------------------------------------------------------------
  const login = useCallback(async (username, password) => {
    const cr = { username, password };
    await api.verifyAuth(cr); // throws on 401/403
    setCreds(cr);
    sessionStorage.setItem('rb_creds', JSON.stringify(cr));
  }, []);

  const logout = useCallback(() => {
    setCreds(null);
    setGameId(null);
    setGameState(null);
    setLog([]);
    sessionStorage.removeItem('rb_creds');
    sessionStorage.removeItem('rb_game_id');
  }, []);

  // ---- Lobby ---------------------------------------------------------------
  const createGame = useCallback(async (maxPlayers) => {
    const res = await api.createGame(creds, maxPlayers);
    const state = res.data ?? res;
    const id = parseInt(state.id, 10);
    setGameId(id);
    setGameState(state);
    sessionStorage.setItem('rb_game_id', id);
    appendLog('Game created. Share the join code: ' + state.join_code);
    return state;
  }, [creds, appendLog]);

  const joinGame = useCallback(async (joinCode) => {
    const found = await api.findGame(creds, joinCode.trim().toUpperCase());
    const foundState = found.data ?? found;
    const id = parseInt(foundState.id, 10);
    const joined = await api.joinGame(creds, id, joinCode.trim().toUpperCase());
    const state = joined.data ?? joined;
    setGameId(id);
    setGameState(state);
    sessionStorage.setItem('rb_game_id', id);
    appendLog('Joined game ' + state.join_code);
    return state;
  }, [creds, appendLog]);

  const startGame = useCallback(async () => {
    const res = await api.startGame(creds, gameId);
    const state = res.data ?? res;
    setGameState(state);
    appendLog('Game started!');
    return state;
  }, [creds, gameId, appendLog]);

  const leaveGame = useCallback(() => {
    setGameId(null);
    setGameState(null);
    sessionStorage.removeItem('rb_game_id');
  }, []);

  // ---- Turn actions --------------------------------------------------------
  const rollDestination = useCallback(async () => {
    const res = await api.rollDestination(creds, gameId);
    const state = res.data ?? res;
    setGameState(state);
    const roll = state.destination_roll;
    appendLog(`Rolled destination: ${roll?.die1}+${roll?.die2}=${roll?.sum} (${roll?.parity}) → ${roll?.destination_name}`);
    return state;
  }, [creds, gameId, appendLog]);

  const getValidMoves = useCallback(async (roll) => {
    const res = await api.getValidMoves(creds, gameId, roll);
    return res.data ?? res;
  }, [creds, gameId]);

  const executeMove = useCallback(async (targetCity, roll) => {
    const res = await api.executeMove(creds, gameId, targetCity, roll);
    const state = res.data ?? res;
    setGameState(state);
    const summary = state.move_summary;
    if (summary) {
      let msg = `Moved to ${targetCity}.`;
      if (summary.tolls_paid > 0) msg += ` Paid $${summary.tolls_paid.toLocaleString()} in tolls.`;
      if (summary.payoff > 0) msg += ` Collected payoff: $${summary.payoff.toLocaleString()}!`;
      if (summary.won) msg += ' 🏆 YOU WIN!';
      appendLog(msg);
    }
    return state;
  }, [creds, gameId, appendLog]);

  const purchaseRailroad = useCallback(async (abbr) => {
    const res = await api.purchaseRailroad(creds, gameId, abbr);
    const state = res.data ?? res;
    setGameState(state);
    appendLog(`Purchased railroad: ${abbr}`);
    return state;
  }, [creds, gameId, appendLog]);

  const purchaseTrain = useCallback(async (trainType) => {
    const res = await api.purchaseTrain(creds, gameId, trainType);
    const state = res.data ?? res;
    setGameState(state);
    appendLog(`Upgraded train to: ${trainType}`);
    return state;
  }, [creds, gameId, appendLog]);

  const endTurn = useCallback(async () => {
    const res = await api.endTurn(creds, gameId);
    const state = res.data ?? res;
    setGameState(state);
    appendLog('Turn ended.');
    return state;
  }, [creds, gameId, appendLog]);

  // ---- Derived state -------------------------------------------------------
  const myUid     = gameState?.current_uid ?? null;
  const myPlayer  = gameState?.players?.find(p => p.uid === myUid) ?? null;
  const isMyTurn  = myUid !== null && gameState?.current_turn_uid === myUid;
  const playerColors = Object.fromEntries(
    (gameState?.players ?? []).map((p, i) => [p.uid, PLAYER_COLORS[i % PLAYER_COLORS.length]])
  );

  return (
    <GameContext.Provider value={{
      creds, gameId, gameState, log, error,
      myUid, myPlayer, isMyTurn, playerColors,
      login, logout,
      createGame, joinGame, startGame, leaveGame,
      rollDestination, getValidMoves, executeMove,
      purchaseRailroad, purchaseTrain, endTurn,
      refreshState,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

export { PLAYER_COLORS };
