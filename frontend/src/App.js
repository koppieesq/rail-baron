import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './Navbar';
import Home from './Home';
import About from './About';
import GameMap from './GameMap';

function AppContent() {
  const location = useLocation();
  const isMap = location.pathname === '/map';

  return (
    <div className={`app${isMap ? ' app--map' : ''}`}>
      <header className={`app-header${isMap ? ' app-header--map' : ''}`}>
        <Navbar />
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<GameMap />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
