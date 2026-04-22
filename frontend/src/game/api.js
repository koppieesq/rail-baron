const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://rb.koplowicz.com';

function authHeader(creds) {
  return 'Basic ' + btoa(`${creds.username}:${creds.password}`);
}

async function apiFetch(path, options = {}, creds) {
  const headers = {
    'Content-Type': 'application/json',
    ...(creds ? { Authorization: authHeader(creds) } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
  if (!res.ok) {
    let errMsg = res.statusText;
    try {
      const body = await res.json();
      errMsg = body.error || errMsg;
    } catch (_) {}
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  // Verify credentials by hitting a known endpoint with a dummy join code.
  // 401/403 = bad credentials. 404/400 = auth succeeded, game just not found.
  // TypeError (no .status) = network error — re-throw so the login form shows it.
  verifyAuth: (creds) =>
    apiFetch('/api/game/find/____', {}, creds).catch(err => {
      if (!err.status) throw err;                   // network / CORS error
      if (err.status === 401 || err.status === 403) throw err; // bad creds
      // Any other HTTP error (404, 400) means the server responded = auth OK.
    }),

  createGame: (creds, maxPlayers = 4) =>
    apiFetch('/api/game', { method: 'POST', body: JSON.stringify({ max_players: maxPlayers }) }, creds),

  findGame: (creds, joinCode) =>
    apiFetch(`/api/game/find/${joinCode}`, {}, creds),

  getState: (creds, gameId) =>
    apiFetch(`/api/game/${gameId}/state`, {}, creds),

  joinGame: (creds, gameId, joinCode) =>
    apiFetch(`/api/game/${gameId}/join`, { method: 'POST', body: JSON.stringify({ join_code: joinCode }) }, creds),

  startGame: (creds, gameId) =>
    apiFetch(`/api/game/${gameId}/start`, { method: 'POST' }, creds),

  endTurn: (creds, gameId) =>
    apiFetch(`/api/game/${gameId}/player`, { method: 'PATCH', body: JSON.stringify({ end_turn: true }) }, creds),

  rollDestination: (creds, gameId) =>
    apiFetch(`/api/game/${gameId}/roll-destination`, { method: 'POST' }, creds),

  getValidMoves: (creds, gameId, roll) =>
    apiFetch(`/api/game/${gameId}/valid-moves?roll=${roll}`, {}, creds),

  executeMove: (creds, gameId, targetCity, roll) =>
    apiFetch(`/api/game/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ target_city: targetCity, roll }),
    }, creds),

  purchaseRailroad: (creds, gameId, abbr) =>
    apiFetch(`/api/game/${gameId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ type: 'railroad', railroad: abbr }),
    }, creds),

  purchaseTrain: (creds, gameId, trainType) =>
    apiFetch(`/api/game/${gameId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ type: 'train', train_type: trainType }),
    }, creds),
};
