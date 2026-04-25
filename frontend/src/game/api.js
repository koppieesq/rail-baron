const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://rb.koplowicz.com';

async function apiFetch(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
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
  // Exchange a Google ID token (credential) for a Drupal Bearer JWT.
  googleAuth: (credential) =>
    apiFetch('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),

  listOpenGames: (token) =>
    apiFetch('/api/games/open', {}, token),

  createGame: (token, maxPlayers = 4) =>
    apiFetch('/api/game', { method: 'POST', body: JSON.stringify({ max_players: maxPlayers }) }, token),

  findGame: (token, joinCode) =>
    apiFetch(`/api/game/find/${joinCode}`, {}, token),

  getState: (token, gameId) =>
    apiFetch(`/api/game/${gameId}/state`, {}, token),

  joinGame: (token, gameId, joinCode) =>
    apiFetch(`/api/game/${gameId}/join`, { method: 'POST', body: JSON.stringify({ join_code: joinCode }) }, token),

  startGame: (token, gameId) =>
    apiFetch(`/api/game/${gameId}/start`, { method: 'POST' }, token),

  endTurn: (token, gameId) =>
    apiFetch(`/api/game/${gameId}/player`, { method: 'PATCH', body: JSON.stringify({ end_turn: true }) }, token),

  rollDestination: (token, gameId) =>
    apiFetch(`/api/game/${gameId}/roll-destination`, { method: 'POST' }, token),

  getValidMoves: (token, gameId, roll) =>
    apiFetch(`/api/game/${gameId}/valid-moves?roll=${roll}`, {}, token),

  executeMove: (token, gameId, targetCity, roll) =>
    apiFetch(`/api/game/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ target_city: targetCity, roll }),
    }, token),

  purchaseRailroad: (token, gameId, abbr) =>
    apiFetch(`/api/game/${gameId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ type: 'railroad', railroad: abbr }),
    }, token),

  purchaseTrain: (token, gameId, trainType) =>
    apiFetch(`/api/game/${gameId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ type: 'train', train_type: trainType }),
    }, token),
};
