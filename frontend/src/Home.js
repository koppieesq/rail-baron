import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem', padding: '0 2rem' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '0.25rem' }}>Rail Baron</h1>
      <p style={{ fontSize: '1.3rem', fontStyle: 'italic', marginBottom: '2rem', color: '#555' }}>
        Build your railroad empire. Outrun your rivals. Rule the rails.
      </p>

      <button
        onClick={() => navigate('/play')}
        style={{
          fontSize: '1.2rem',
          padding: '0.75rem 2.5rem',
          marginBottom: '2.5rem',
          cursor: 'pointer',
          backgroundColor: '#0000cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'inherit',
        }}
      >
        Play Now
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <img
          src={`${process.env.PUBLIC_URL}/railbaron.png`}
          alt="The Rail Baron"
          style={{ width: '180px', flexShrink: 0 }}
        />
        <img
          src={`${process.env.PUBLIC_URL}/board2.jpg`}
          alt="Rail Baron game board"
          style={{ maxWidth: '100%', width: '700px', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
        />
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto 3rem', textAlign: 'left', lineHeight: '1.7' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>How to Play</h2>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>Roll the dice to determine your destination city and potential payoff.</li>
          <li>Plot a route across the US railroad network to reach your destination.</li>
          <li>Pay usage fees to ride railroads you don't own — or buy them outright.</li>
          <li>Collect your payoff when you arrive, then roll for a new destination.</li>
          <li>The first player to amass <strong>$200,000</strong> and return home wins!</li>
        </ol>
      </div>
    </div>
  );
}

export default Home;
