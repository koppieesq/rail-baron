import { useEffect, useRef } from 'react';
import { useGame } from './GameContext';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function GameLog() {
  const { log } = useGame();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  if (log.length === 0) return null;

  return (
    <div className="rb-game-log">
      <h4 className="rb-game-log-title">Game Log</h4>
      <ul className="rb-log-list">
        {log.map((entry, i) => (
          <li key={i} className="rb-log-entry">
            <span className="rb-log-time">{formatTime(entry.ts)}</span>
            <span className="rb-log-msg">{entry.msg}</span>
          </li>
        ))}
        <li ref={bottomRef} />
      </ul>
    </div>
  );
}
