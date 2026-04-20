import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './Navbar';
import Home from './Home';
import About from './About';
import GameMap from './GameMap';
import { GameProvider, useGame } from './game/GameContext';
import LoginScreen from './game/LoginScreen';
import LobbyScreen from './game/LobbyScreen';
import GameView from './game/GameView';

// Decides which game screen to show based on auth + game state.
function GameRouter() {
  const { creds, gameId, gameState } = useGame();

  if (!creds) return <LoginScreen />;

  // Active or finished game.
  if (gameId && gameState && (gameState.status === 'active' || gameState.status === 'finished')) {
    return <GameView />;
  }

  // Lobby: create/join, or waiting room.
  return <LobbyScreen />;
}

function App() {
  return (
    <Router>
      <GameProvider>
        <div className="app">
          <header className="app-header">
            <Navbar />
          </header>
          <Routes>
            <Route path="/"      element={<Home />} />
            <Route path="/map"   element={<GameMap />} />
            <Route path="/about" element={<About />} />
            <Route path="/play"  element={<GameRouter />} />
            <Route path="*"      element={<Home />} />
          </Routes>
        </div>
      </GameProvider>
    </Router>
  );
}

export default App;
