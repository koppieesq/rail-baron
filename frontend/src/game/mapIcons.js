/**
 * Leaflet divIcon factories for game map markers.
 *
 * SVGs are inlined as strings so `currentColor` inherits the CSS `color`
 * property set on the wrapper div — this is the only reliable way to
 * recolor an SVG inside a Leaflet divIcon.
 */
import L from 'leaflet';

const LOCO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 56" width="100%" height="100%">
  <circle cx="16" cy="6" r="5" fill="currentColor" opacity="0.25"/>
  <circle cx="24" cy="3" r="3.5" fill="currentColor" opacity="0.18"/>
  <circle cx="30" cy="5" r="2.5" fill="currentColor" opacity="0.12"/>
  <rect x="12" y="11" width="8" height="17" fill="currentColor" opacity="0.9"/>
  <rect x="9" y="8" width="14" height="6" rx="2" fill="currentColor"/>
  <rect x="8" y="24" width="44" height="16" rx="9" fill="currentColor" opacity="0.8"/>
  <ellipse cx="30" cy="23" rx="7" ry="5" fill="currentColor" opacity="0.85"/>
  <circle cx="42" cy="23" r="3.5" fill="currentColor"/>
  <rect x="48" y="16" width="13" height="24" rx="1" fill="currentColor" opacity="0.9"/>
  <rect x="46" y="13" width="17" height="5" rx="1" fill="currentColor"/>
  <rect x="51" y="20" width="5" height="8" rx="1" fill="currentColor" opacity="0.2"/>
  <rect x="6" y="38" width="54" height="3" fill="currentColor"/>
  <polygon points="4,41 10,41 7,51" fill="currentColor" opacity="0.85"/>
  <circle cx="21" cy="47" r="8" fill="currentColor"/>
  <circle cx="21" cy="47" r="3" fill="currentColor" opacity="0.3"/>
  <circle cx="38" cy="47" r="8" fill="currentColor"/>
  <circle cx="38" cy="47" r="3" fill="currentColor" opacity="0.3"/>
  <circle cx="8" cy="49" r="5" fill="currentColor"/>
  <circle cx="8" cy="49" r="1.8" fill="currentColor" opacity="0.3"/>
  <circle cx="55" cy="49" r="5" fill="currentColor"/>
  <circle cx="55" cy="49" r="1.8" fill="currentColor" opacity="0.3"/>
  <rect x="17" y="45" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.6"/>
  <circle cx="7" cy="32" r="3.5" fill="currentColor" opacity="0.5"/>
</svg>`;

const TOWER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72" width="100%" height="100%">
  <path d="M13,8 Q13,3 32,3 Q51,3 51,8 L55,33 Q55,42 32,42 Q9,42 9,33 Z" fill="currentColor" opacity="0.85"/>
  <ellipse cx="32" cy="33" rx="23" ry="5" fill="currentColor" opacity="0.6"/>
  <path d="M10,20 Q10,18 32,18 Q54,18 54,20" stroke="currentColor" stroke-width="2.5" fill="none" opacity="0.5"/>
  <path d="M12,28 Q12,26 32,26 Q52,26 52,28" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4"/>
  <ellipse cx="32" cy="8" rx="19" ry="5" fill="currentColor"/>
  <line x1="20" y1="40" x2="14" y2="67" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <line x1="32" y1="42" x2="32" y2="67" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <line x1="44" y1="40" x2="50" y2="67" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <line x1="17" y1="48" x2="47" y2="61" stroke="currentColor" stroke-width="2.5" opacity="0.6"/>
  <line x1="47" y1="48" x2="17" y2="61" stroke="currentColor" stroke-width="2.5" opacity="0.6"/>
  <rect x="10" y="67" width="44" height="5" rx="2" fill="currentColor"/>
  <line x1="30" y1="18" x2="62" y2="10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  <circle cx="30" cy="18" r="4" fill="currentColor" opacity="0.7"/>
  <line x1="62" y1="10" x2="62" y2="32" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M58,30 Q62,36 66,30" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="62" cy="39" rx="3" ry="4" fill="currentColor" opacity="0.4"/>
</svg>`;

const DEPOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 58" width="100%" height="100%">
  <rect x="2" y="50" width="68" height="7" rx="2" fill="currentColor" opacity="0.7"/>
  <rect x="14" y="22" width="44" height="32" fill="currentColor" opacity="0.6"/>
  <rect x="18" y="28" width="9" height="9" rx="1" fill="currentColor" opacity="0.2"/>
  <rect x="45" y="28" width="9" height="9" rx="1" fill="currentColor" opacity="0.2"/>
  <rect x="29" y="36" width="14" height="16" rx="1" fill="currentColor" opacity="0.85"/>
  <path d="M29,36 Q36,28 43,36" fill="currentColor" opacity="0.75"/>
  <rect x="49" y="8" width="7" height="18" fill="currentColor" opacity="0.9"/>
  <rect x="47" y="6" width="11" height="5" rx="1" fill="currentColor"/>
  <circle cx="53" cy="3" r="3.5" fill="currentColor" opacity="0.2"/>
  <circle cx="58" cy="1" r="2.5" fill="currentColor" opacity="0.13"/>
  <polygon points="2,24 36,4 70,24" fill="currentColor"/>
  <rect x="1" y="42" width="70" height="7" rx="2" fill="currentColor" opacity="0.9"/>
  <rect x="7" y="42" width="3" height="12" fill="currentColor" opacity="0.8"/>
  <rect x="34" y="42" width="3" height="12" fill="currentColor" opacity="0.8"/>
  <rect x="62" y="42" width="3" height="12" fill="currentColor" opacity="0.8"/>
  <rect x="20" y="12" width="32" height="9" rx="1" fill="currentColor" opacity="0.3"/>
  <line x1="24" y1="17" x2="48" y2="17" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
</svg>`;

function makeDivIcon(svgStr, color, w, h, anchor) {
  return L.divIcon({
    html: `<div style="color:${color};width:${w}px;height:${h}px;line-height:0;display:block">${svgStr}</div>`,
    className: '',           // removes Leaflet's default white-box styling
    iconSize: [w, h],
    iconAnchor: anchor,
    tooltipAnchor: [0, -(h / 2)],
  });
}

// Current player position — locomotive, centered on city dot
export const locomotiveIcon = (color) => makeDivIcon(LOCO,  color, 40, 35, [20, 17]);

// Destination marker — water tower, anchored at its base
export const waterTowerIcon = (color) => makeDivIcon(TOWER, color, 28, 32, [14, 32]);

// Origin / haul start — depot, anchored at its base
export const depotIcon      = (color) => makeDivIcon(DEPOT, color, 34, 27, [17, 27]);
