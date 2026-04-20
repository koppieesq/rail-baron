import { useState } from 'react';
import { useGame } from './GameContext';
import GameMapView from './GameMapView';
import PlayerPanel from './PlayerPanel';
import TurnPanel from './TurnPanel';
import GameLog from './GameLog';
import './game.css';

export default function GameView() {
  const { gameState, leaveGame } = useGame();
  const [validMoves, setValidMoves] = useState([]);
  const [validMovesRoll, setRoll]   = useState(null);
  const [sideTab, setSideTab]       = useState('turn'); // 'turn' | 'players' | 'log'

  if (!gameState) return <div className="rb-loading">Loading game…</div>;

  const handleValidMoves = (moves, roll) => {
    setValidMoves(moves);
    setRoll(roll);
  };
  const handleClearMoves = () => {
    setValidMoves([]);
    setRoll(null);
  };

  return (
    <div className="rb-game-view">
      {/* Map — left side */}
      <div className="rb-game-map-area">
        <GameMapView validMoves={validMoves} validMovesRoll={validMovesRoll} />
      </div>

      {/* Side panel — right side */}
      <aside className="rb-game-side">
        <div className="rb-game-side-header">
          <span className="rb-game-code">#{gameState.join_code}</span>
          <button className="rb-btn rb-btn--ghost rb-btn--sm" onClick={leaveGame}>← Lobby</button>
        </div>

        <div className="rb-tab-row">
          <button className={`rb-tab${sideTab === 'turn' ? ' active' : ''}`} onClick={() => setSideTab('turn')}>Turn</button>
          <button className={`rb-tab${sideTab === 'players' ? ' active' : ''}`} onClick={() => setSideTab('players')}>Players</button>
          <button className={`rb-tab${sideTab === 'log' ? ' active' : ''}`} onClick={() => setSideTab('log')}>Log</button>
        </div>

        <div className="rb-game-side-body">
          {sideTab === 'turn'    && <TurnPanel onValidMoves={handleValidMoves} onClearMoves={handleClearMoves} />}
          {sideTab === 'players' && <PlayerPanel />}
          {sideTab === 'log'     && <GameLog />}
        </div>
      </aside>
    </div>
  );
}
