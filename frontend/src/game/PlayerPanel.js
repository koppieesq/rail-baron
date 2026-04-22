import cities from '../data/cities.json';
import { useGame } from './GameContext';

const cityById = Object.fromEntries(cities.map(c => [c.id, c]));

const TRAIN_LABEL = { standard: 'Standard', express: 'Express', superchief: 'Super Chief' };

function MoneyBar({ money }) {
  const pct = Math.min(100, (money / 200000) * 100);
  return (
    <div className="rb-money-bar-wrap" title={`$${money.toLocaleString()} / $200,000`}>
      <div className="rb-money-bar" style={{ width: `${pct}%` }} />
      <span className="rb-money-label">${money.toLocaleString()}</span>
    </div>
  );
}

function PlayerCard({ player, isSelf, isActive, color }) {
  const home    = cityById[player.home_city_id];
  const current = cityById[player.current_city_id];
  const dest    = cityById[player.destination_city_id];
  const origin  = cityById[player.origin_city_id];

  return (
    <div className={`rb-player-card${isSelf ? ' rb-player-card--self' : ''}${isActive ? ' rb-player-card--active' : ''}`}>
      <div className="rb-player-card-header">
        <span className="rb-player-dot" style={{ background: color }} />
        <span className="rb-player-name">
          {isSelf ? 'You' : (player.username ?? `Player ${player.turn_order + 1}`)}
        </span>
        {isActive && <span className="rb-turn-badge">Turn</span>}
      </div>

      <MoneyBar money={player.money} />

      <dl className="rb-player-dl">
        <dt>Train</dt>
        <dd>{TRAIN_LABEL[player.train_type] ?? player.train_type}</dd>

        <dt>Location</dt>
        <dd>{current?.name ?? '—'}</dd>

        {home && (
          <>
            <dt>Home</dt>
            <dd>{home.name}</dd>
          </>
        )}

        {dest && (
          <>
            <dt>Destination</dt>
            <dd>{dest.name}</dd>
          </>
        )}

        {origin && dest && (
          <>
            <dt>From</dt>
            <dd>{origin.name}</dd>
          </>
        )}
      </dl>

      {player.owned_railroads?.length > 0 && (
        <div className="rb-owned-rr">
          <span className="rb-owned-rr-label">Owns: </span>
          {player.owned_railroads.map(abbr => (
            <span key={abbr} className="rb-rr-tag">{abbr}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerPanel() {
  const { gameState, myUid, playerColors } = useGame();
  if (!gameState) return null;

  const { players, current_turn_uid } = gameState;

  // Current player first, then others.
  const sorted = [
    ...players.filter(p => p.uid === myUid),
    ...players.filter(p => p.uid !== myUid),
  ];

  return (
    <div className="rb-player-panel">
      {sorted.map(p => (
        <PlayerCard
          key={p.uid}
          player={p}
          isSelf={p.uid === myUid}
          isActive={p.uid === current_turn_uid}
          color={playerColors[p.uid] ?? '#999'}
        />
      ))}
    </div>
  );
}
