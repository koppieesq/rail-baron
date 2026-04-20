import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import cities from './data/cities.json';
import railroads from './data/railroads.json';
import routeSegmentsRaw from './data/routeSegments.json';

// Strip the note object from the segments array
const routeSegments = routeSegmentsRaw.filter(s => s.city_a);

// Build a city lookup by name for fast coordinate resolution
const cityByName = Object.fromEntries(cities.map(c => [c.name, c]));

// Colors assigned to each railroad abbreviation.
// Chosen to be visually distinct and loosely match historical livery colors.
const RAILROAD_COLORS = {
  'ACL':     '#1a73e8', // bright blue
  'AT&SF':   '#e53935', // red
  'B&M':     '#6d4c41', // brown
  'B&O':     '#0288d1', // light blue
  'C&NW':    '#ffd600', // yellow
  'C&O':     '#00897b', // teal
  'CB&Q':    '#7b1fa2', // purple
  'CMStP&P': '#f4511e', // deep orange
  'CRI&P':   '#c62828', // dark red
  'D&RGW':   '#558b2f', // olive green
  'GM&O':    '#ff6f00', // amber
  'GN':      '#1b5e20', // dark green
  'IC':      '#4e342e', // dark brown
  'L&N':     '#ad1457', // pink
  'MP':      '#283593', // dark blue
  'N&W':     '#4527a0', // deep purple
  'NP':      '#006064', // dark teal
  'NYC':     '#37474f', // blue grey
  'NYNH&H':  '#e65100', // orange
  'PA':      '#1565c0', // blue
  'RF&P':    '#880e4f', // dark pink
  'SAL':     '#00695c', // green
  'SLSF':    '#9e9d24', // yellow-green
  'SOU':     '#ef6c00', // burnt orange
  'SP':      '#b71c1c', // deep red
  'T&P':     '#4a148c', // deep purple
  'UP':      '#f9a825', // gold
  'WP':      '#0277bd', // sky blue
};

const REGION_COLORS = {
  NE: '#e53935',
  SE: '#8e24aa',
  NC: '#1e88e5',
  SC: '#f4511e',
  PL: '#43a047',
  NW: '#00acc1',
  SW: '#fb8c00',
};

function GameMap() {
  // Build polylines grouped by railroad so we can toggle visibility later
  const segments = routeSegments.map(seg => {
    const a = cityByName[seg.city_a];
    const b = cityByName[seg.city_b];
    if (!a || !b) return null;
    return { ...seg, positions: [[a.lat, a.lng], [b.lat, b.lng]], color: RAILROAD_COLORS[seg.railroad] || '#999' };
  }).filter(Boolean);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <MapContainer
        center={[39.5, -98.5]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route segments as colored polylines */}
        {segments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            color={seg.color}
            weight={3}
            opacity={0.85}
          >
            <Tooltip sticky>
              {seg.city_a} → {seg.city_b}<br />
              {seg.railroad} · {seg.movement_spaces} spaces
              {seg.verified ? '' : ' (unverified)'}
            </Tooltip>
          </Polyline>
        ))}

        {/* City markers */}
        {cities.map(city => (
          <CircleMarker
            key={city.id}
            center={[city.lat, city.lng]}
            radius={6}
            color="#111"
            weight={1.5}
            fillColor={REGION_COLORS[city.region] || '#999'}
            fillOpacity={1}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent={false}>
              <strong>{city.name}</strong><br />
              Region: {city.region}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={legendStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>Regions</div>
        {Object.entries(REGION_COLORS).map(([region, color]) => (
          <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid #333' }} />
            <span style={{ fontSize: 12 }}>{region}</span>
          </div>
        ))}
        <hr style={{ margin: '8px 0', borderColor: '#ccc' }} />
        <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>Railroads</div>
        {railroads.map(rr => (
          <div key={rr.abbr} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ width: 20, height: 4, background: RAILROAD_COLORS[rr.abbr] || '#999', borderRadius: 2 }} />
            <span style={{ fontSize: 11 }}>{rr.abbr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const legendStyle = {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 1000,
  background: 'rgba(255,255,255,0.93)',
  border: '1px solid #bbb',
  borderRadius: 6,
  padding: '10px 12px',
  maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

export default GameMap;
