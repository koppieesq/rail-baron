/**
 * GameMapView — Leaflet map used inside the active game screen.
 *
 * Shows all route segments, city markers, player tokens, and optionally
 * highlights valid move targets when the active player is picking a city.
 */
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import cities from '../data/cities.json';
import routeSegmentsRaw from '../data/routeSegments.json';
import { useGame } from './GameContext';
import { locomotiveIcon, waterTowerIcon, depotIcon } from './mapIcons';

const routeSegments = routeSegmentsRaw.filter(s => s.city_a);
const cityByName    = Object.fromEntries(cities.map(c => [c.name, c]));
const cityById      = Object.fromEntries(cities.map(c => [c.id, c]));

const RAILROAD_COLORS = {
  'ACL':     '#1a73e8', 'AT&SF':   '#e53935', 'B&M':     '#6d4c41',
  'B&O':     '#0288d1', 'C&NW':    '#ffd600', 'C&O':     '#00897b',
  'CB&Q':    '#7b1fa2', 'CMStP&P': '#f4511e', 'CRI&P':   '#c62828',
  'D&RGW':   '#558b2f', 'GM&O':    '#ff6f00', 'GN':      '#1b5e20',
  'IC':      '#4e342e', 'L&N':     '#ad1457', 'MP':      '#283593',
  'N&W':     '#4527a0', 'NP':      '#006064', 'NYC':     '#37474f',
  'NYNH&H':  '#e65100', 'PA':      '#1565c0', 'RF&P':    '#880e4f',
  'SAL':     '#00695c', 'SLSF':    '#9e9d24', 'SOU':     '#ef6c00',
  'SP':      '#b71c1c', 'T&P':     '#4a148c', 'UP':      '#f9a825',
  'WP':      '#0277bd',
};

const REGION_COLORS = {
  NE: '#e53935', SE: '#8e24aa', NC: '#1e88e5', SC: '#f4511e',
  PL: '#43a047', NW: '#00acc1', SW: '#fb8c00',
};

export default function GameMapView({ validMoves = [], validMovesRoll }) {
  const { gameState, myUid, playerColors } = useGame();

  // Build a lookup: which railroad is owned by whom.
  const rrOwner = {};
  (gameState?.players ?? []).forEach(p => {
    (p.owned_railroads ?? []).forEach(abbr => { rrOwner[abbr] = p; });
  });

  // Build polylines: override color if owned by a player.
  const segments = routeSegments.map(seg => {
    const a = cityByName[seg.city_a];
    const b = cityByName[seg.city_b];
    if (!a || !b) return null;
    const owner = rrOwner[seg.railroad];
    const color = owner ? playerColors[owner.uid] : (RAILROAD_COLORS[seg.railroad] || '#999');
    const weight = owner ? 5 : 3;
    return { ...seg, positions: [[a.lat, a.lng], [b.lat, b.lng]], color, weight };
  }).filter(Boolean);

  // Valid-move targets as a Set for quick lookup.
  const validSet = new Set(validMoves.map(m => m.city));

  // Per-player map markers: locomotive (current), depot (origin), water tower (destination).
  const playerMarkers = (gameState?.players ?? []).flatMap(p => {
    const color   = playerColors[p.uid] ?? '#999';
    const name    = p.username ?? `Player ${p.turn_order + 1}`;
    const markers = [];

    const currentCity = cityById[p.current_city_id];
    if (currentCity) {
      markers.push({ key: `loco-${p.uid}`, lat: currentCity.lat, lng: currentCity.lng,
        icon: locomotiveIcon(color), label: `${p.uid === myUid ? 'You' : name} — ${currentCity.name}` });
    }

    const originCity = cityById[p.origin_city_id];
    if (originCity && p.origin_city_id !== 0) {
      markers.push({ key: `depot-${p.uid}`, lat: originCity.lat + 0.3, lng: originCity.lng - 0.8,
        icon: depotIcon(color), label: `${name}'s origin — ${originCity.name}` });
    }

    const destCity = cityById[p.destination_city_id];
    if (destCity && p.destination_city_id !== 0) {
      markers.push({ key: `dest-${p.uid}`, lat: destCity.lat + 0.3, lng: destCity.lng + 0.8,
        icon: waterTowerIcon(color), label: `${name}'s destination — ${destCity.name}` });
    }

    return markers;
  });

  return (
    <MapContainer
      center={[39.5, -98.5]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route segments */}
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.positions}
          color={seg.color}
          weight={seg.weight}
          opacity={0.85}
        >
          <Tooltip sticky>
            {seg.city_a} → {seg.city_b}<br />
            {seg.railroad} · {seg.movement_spaces} spaces
            {rrOwner[seg.railroad] ? ` (owned by P${rrOwner[seg.railroad].turn_order + 1})` : ''}
          </Tooltip>
        </Polyline>
      ))}

      {/* City markers */}
      {cities.map(city => {
        const isValid = validSet.has(city.name);
        const radius  = isValid ? 9 : 6;
        const stroke  = isValid ? '#fff' : '#111';
        const fill    = isValid ? '#ffe082' : (REGION_COLORS[city.region] || '#999');
        const weight  = isValid ? 2.5 : 1.5;
        return (
          <CircleMarker
            key={city.id}
            center={[city.lat, city.lng]}
            radius={radius}
            color={stroke}
            weight={weight}
            fillColor={fill}
            fillOpacity={1}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{city.name}</strong>
              {isValid && validMovesRoll && (
                <span> · reachable in ≤{validMovesRoll}</span>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Player markers: locomotive (current city), depot (origin), water tower (destination) */}
      {playerMarkers.map(m => (
        <Marker key={m.key} position={[m.lat, m.lng]} icon={m.icon}>
          <Tooltip direction="top">{m.label}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
