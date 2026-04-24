import { useCallback, useEffect, useRef, useState } from 'react';
import railroads from '../data/railroads.json';
import cities from '../data/cities.json';
import { useGame } from './GameContext';

const cityById = Object.fromEntries(cities.map(c => [c.id, c]));

// Roll 2d6 and return { die1, die2, total }.
function rollDice() {
  const d = () => Math.floor(Math.random() * 6) + 1;
  const die1 = d(), die2 = d();
  return { die1, die2, total: die1 + die2 };
}

// ---- Sub-panels ----------------------------------------------------------

function NotYourTurn({ currentPlayerLabel }) {
  return (
    <div className="rb-turn-waiting">
      <div className="rb-turn-waiting-icon">⏳</div>
      <p>Waiting for <strong>{currentPlayerLabel}</strong> to take their turn…</p>
    </div>
  );
}

function GameOver({ winner }) {
  return (
    <div className="rb-turn-gameover">
      <div className="rb-turn-gameover-icon">🏆</div>
      <h3>{winner} wins!</h3>
    </div>
  );
}

function PurchasePanel({ player, onPurchase, onDone }) {
  const { gameState } = useGame();
  const [tab, setTab] = useState('railroad'); // 'railroad' | 'train'
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  const allOwned = new Set(
    (gameState?.players ?? []).flatMap(p => p.owned_railroads ?? [])
  );
  const availableRR = railroads.filter(rr => !allOwned.has(rr.abbr));

  const doRR = async (abbr) => {
    setBusy(true); setErr('');
    try { await onPurchase('railroad', abbr); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const doTrain = async (type) => {
    setBusy(true); setErr('');
    try { await onPurchase('train', type); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const canUpgradeToExpress    = player.train_type === 'standard';
  const canUpgradeToSuperchief = player.train_type === 'express';

  return (
    <div className="rb-purchase-panel">
      <div className="rb-tab-row">
        <button className={`rb-tab${tab === 'railroad' ? ' active' : ''}`} onClick={() => setTab('railroad')}>Railroad</button>
        <button className={`rb-tab${tab === 'train' ? ' active' : ''}`} onClick={() => setTab('train')}>Train</button>
      </div>

      {tab === 'railroad' && (
        <div className="rb-rr-grid">
          {availableRR.length === 0 && <p className="rb-muted">All railroads owned.</p>}
          {availableRR.map(rr => (
            <button
              key={rr.abbr}
              className="rb-rr-buy-btn"
              onClick={() => doRR(rr.abbr)}
              disabled={busy || player.money < rr.price}
              title={`${rr.name} — $${rr.price.toLocaleString()}`}
            >
              <span>{rr.abbr}</span>
              <span className="rb-rr-price">${(rr.price / 1000).toFixed(0)}k</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'train' && (
        <div className="rb-train-options">
          {canUpgradeToExpress && (
            <button
              className="rb-btn rb-btn--secondary"
              onClick={() => doTrain('express')}
              disabled={busy || player.money < 4000}
            >
              Upgrade to Express — $4,000
            </button>
          )}
          {canUpgradeToSuperchief && (
            <button
              className="rb-btn rb-btn--secondary"
              onClick={() => doTrain('superchief')}
              disabled={busy || player.money < 6000}
            >
              Upgrade to Super Chief — $6,000
            </button>
          )}
          {!canUpgradeToExpress && !canUpgradeToSuperchief && (
            <p className="rb-muted">Train fully upgraded.</p>
          )}
        </div>
      )}

      {err && <p className="rb-error">{err}</p>}

      <button className="rb-btn rb-btn--ghost rb-mt" onClick={onDone}>Skip / End Turn</button>
    </div>
  );
}

// ---- Main turn panel -------------------------------------------------------

export default function TurnPanel({ onValidMoves, onClearMoves }) {
  const {
    gameState, myPlayer, isMyTurn,
    rollDestination, getValidMoves, executeMove,
    purchaseRailroad, purchaseTrain, endTurn,
  } = useGame();

  // Local turn phase; reset whenever our turn begins.
  const [phase, setPhase]           = useState('init'); // init | roll_dest | roll_move | pick_city | post_move | purchase
  const [destRoll, setDestRoll]     = useState(null);   // server response
  const [moveRoll, setMoveRoll]     = useState(null);   // { die1, die2, total }
  const [validMoves, setValidMoves] = useState([]);
  const [moveSummary, setMoveSummary] = useState(null);
  const [busy, setBusy]             = useState(false);
  const [err, setErr]               = useState('');
  const prevTurnRef                 = useRef(null);

  // Reset when it becomes our turn.
  useEffect(() => {
    if (!isMyTurn) {
      onClearMoves();
      return;
    }
    if (prevTurnRef.current !== gameState?.current_turn_uid) {
      prevTurnRef.current = gameState?.current_turn_uid;
      setPhase('init');
      setDestRoll(null);
      setMoveRoll(null);
      setValidMoves([]);
      setMoveSummary(null);
      setErr('');
      onClearMoves();
    }
  }, [isMyTurn, gameState?.current_turn_uid, onClearMoves]);

  const run = useCallback(async (fn) => {
    setBusy(true); setErr('');
    try { return await fn(); }
    catch (e) { setErr(e.message); return null; }
    finally { setBusy(false); }
  }, []);

  if (!gameState) return null;
  if (gameState.status === 'finished') {
    const winner = gameState.players?.find(p => p.uid === gameState.current_turn_uid);
    return <GameOver winner={winner ? (winner.username ?? `Player ${winner.turn_order + 1}`) : 'Someone'} />;
  }
  if (!isMyTurn) {
    const active = gameState.players?.find(p => p.uid === gameState.current_turn_uid);
    const label  = active ? (active.username ?? `Player ${active.turn_order + 1}`) : 'another player';
    return <NotYourTurn currentPlayerLabel={label} />;
  }

  // ---- It's our turn -------------------------------------------------------
  const needsDest = (myPlayer?.destination_city_id ?? 0) === 0;

  const handleRollDest = () => run(async () => {
    const state = await rollDestination();
    setDestRoll(state.destination_roll);
    setPhase('roll_dest');
  });

  const handleRollMove = () => run(async () => {
    const roll = rollDice();
    setMoveRoll(roll);
    const moves = await getValidMoves(roll.total);
    setValidMoves(moves.valid_moves ?? []);
    onValidMoves(moves.valid_moves ?? [], roll.total);
    setPhase('pick_city');
  });

  const handleMove = (cityName) => run(async () => {
    const state = await executeMove(cityName, moveRoll.total);
    setMoveSummary(state.move_summary ?? null);
    setValidMoves([]);
    onClearMoves();
    setPhase('post_move');
  });

  const handlePurchase = (type, value) => run(async () => {
    if (type === 'railroad') await purchaseRailroad(value);
    else                     await purchaseTrain(value);
  });

  const handleEndTurn = () => run(async () => {
    await endTurn();
    setPhase('init');
    setDestRoll(null);
    setMoveRoll(null);
    setMoveSummary(null);
    setValidMoves([]);
    onClearMoves();
  });

  const destCity = cityById[myPlayer?.destination_city_id];

  return (
    <div className="rb-turn-panel">
      <h3 className="rb-turn-heading">Your Turn</h3>

      {err && <p className="rb-error">{err}</p>}

      {/* STEP 1: Roll for destination */}
      {needsDest && phase !== 'post_move' && phase !== 'purchase' && (
        <div className="rb-turn-step">
          <p>You have no destination. Roll to find out where you're going!</p>
          <button className="rb-btn rb-btn--primary" onClick={handleRollDest} disabled={busy}>
            Roll for Destination
          </button>
          {destRoll && (
            <div className="rb-dice-result">
              🎲 {destRoll.die1} + {destRoll.die2} = {destRoll.sum} ({destRoll.parity})<br />
              <strong>→ {destRoll.destination_name}</strong>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Roll movement dice */}
      {!needsDest && (phase === 'init' || phase === 'roll_dest') && (
        <div className="rb-turn-step">
          {destCity && (
            <p className="rb-dest-label">
              Heading to: <strong>{destCity.name}</strong>
            </p>
          )}
          <button className="rb-btn rb-btn--primary" onClick={handleRollMove} disabled={busy}>
            Roll Movement Dice
          </button>
          {moveRoll && (
            <div className="rb-dice-result">
              🎲 {moveRoll.die1} + {moveRoll.die2} = <strong>{moveRoll.total}</strong>
            </div>
          )}
        </div>
      )}

      {/* STEP 3a: No reachable cities — skip move */}
      {phase === 'pick_city' && validMoves.length === 0 && (
        <div className="rb-turn-step">
          <div className="rb-dice-result">
            🎲 You rolled <strong>{moveRoll?.total}</strong> — not enough movement to reach any city.
          </div>
          <button className="rb-btn rb-btn--ghost rb-mt" onClick={handleEndTurn} disabled={busy}>
            End Turn
          </button>
        </div>
      )}

      {/* STEP 3b: Pick a city */}
      {phase === 'pick_city' && validMoves.length > 0 && (
        <div className="rb-turn-step">
          <p>🎲 You rolled <strong>{moveRoll?.total}</strong>. Pick a destination:</p>
          <ul className="rb-move-list">
            {validMoves.map(m => (
              <li key={m.city}>
                <button
                  className={`rb-move-btn${m.is_destination ? ' rb-move-btn--dest' : ''}`}
                  onClick={() => handleMove(m.city)}
                  disabled={busy}
                >
                  {m.city}
                  <span className="rb-move-cost">{m.movement_cost} sp</span>
                  {m.is_destination && <span className="rb-move-dest-tag">★ destination</span>}
                </button>
              </li>
            ))}
          </ul>
          <button className="rb-btn rb-btn--ghost rb-mt" onClick={handleEndTurn} disabled={busy}>
            Stay &amp; End Turn
          </button>
        </div>
      )}

      {/* STEP 4: Post-move summary */}
      {phase === 'post_move' && moveSummary && (
        <div className="rb-turn-step">
          <div className="rb-move-summary">
            {moveSummary.tolls_paid > 0 && (
              <p>🚂 Tolls paid: <strong>${moveSummary.tolls_paid.toLocaleString()}</strong></p>
            )}
            {moveSummary.payoff > 0 && (
              <p>💰 Payoff collected: <strong>${moveSummary.payoff.toLocaleString()}</strong></p>
            )}
            {moveSummary.won && (
              <p className="rb-win-msg">🏆 You win!</p>
            )}
          </div>

          {!moveSummary.won && (
            <button
              className="rb-btn rb-btn--secondary"
              onClick={() => setPhase('purchase')}
              disabled={busy}
            >
              Purchase Railroad or Train
            </button>
          )}

          {!moveSummary.won && (
            <button
              className="rb-btn rb-btn--ghost rb-mt"
              onClick={handleEndTurn}
              disabled={busy}
            >
              End Turn
            </button>
          )}
        </div>
      )}

      {/* Optional purchase */}
      {phase === 'purchase' && (
        <PurchasePanel
          player={myPlayer}
          onPurchase={handlePurchase}
          onDone={handleEndTurn}
        />
      )}
    </div>
  );
}
