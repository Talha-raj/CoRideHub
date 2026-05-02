/**
 * src/utils/mapSearch.js
 *
 * Centralized geocoding utilities. All map search logic lives here —
 * screens import these functions and never call the Google API directly.
 *
 * Exports
 * ───────
 *   searchLocation(query)         → Promise<SearchResult[]>
 *   reverseGeocode(lat, lng)      → Promise<{ address: string }>
 *
 * SearchResult shape
 * ──────────────────
 *   { name, address, latitude, longitude }
 */

import { GOOGLE_MAPS_API_KEY } from './Creds';

const PLACES_TEXT_SEARCH = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const GEOCODE_BASE        = 'https://maps.googleapis.com/maps/api/geocode/json';

// ─── Forward search ───────────────────────────────────────────────────────────

/**
 * Search for places / addresses matching `query`.
 * Uses Places Text Search — handles partial input, business names, landmarks.
 *
 * @param {string} query
 * @returns {Promise<Array<{name: string, address: string, latitude: number, longitude: number}>>}
 */
export async function searchLocation(query) {
  if (!query || query.trim().length < 3) return [];

  const url =
    `${PLACES_TEXT_SEARCH}?query=${encodeURIComponent(query.trim())}&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Network error: ${res.status}`);

  const data = await res.json();

  if (data.status === 'ZERO_RESULTS') return [];

  if (data.status !== 'OK') {
    throw new Error(`Places API error: ${data.status}`);
  }

  return data.results.slice(0, 5).map(r => ({
    name:      r.name,
    address:   r.formatted_address,
    latitude:  r.geometry.location.lat,
    longitude: r.geometry.location.lng,
  }));
}

// ─── Reverse geocoding ────────────────────────────────────────────────────────

/**
 * Convert a lat/lng pair back to a human-readable address.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ address: string }>}
 *   Falls back to coordinate string on API / network failure.
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const url =
      `${GEOCODE_BASE}?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network error: ${res.status}`);

    const data = await res.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      return { address: data.results[0].formatted_address };
    }
  } catch (err) {
    console.warn('[mapSearch] reverseGeocode failed:', err.message);
  }

  // Graceful fallback — never crash the caller
  return { address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` };
}
