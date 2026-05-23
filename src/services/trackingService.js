/**
 * src/services/trackingService.js
 *
 * Module-level tracking singleton — lives outside any React component so
 * location callbacks persist across screen navigation, backgrounding, etc.
 *
 * Socket emission strategy — "major change" approach:
 *   Emit immediately when the driver moves ≥ DISTANCE_THRESHOLD_M metres.
 *   Also emit a heartbeat every HEARTBEAT_MS even when stationary, so the
 *   user's map knows the driver hasn't frozen.
 *
 * Public API
 * ──────────
 *   startTracking(routeId)  → Promise<void>
 *   stopTracking(routeId)   → void
 *   isTracking()            → boolean
 */

import api from '../config/api';
import { setErrorCallback, setLocationCallback } from './locationService';
import { connectSocket, getSocket } from './socketService';

// Emit when driver moves more than this distance (metres)
const DISTANCE_THRESHOLD_M = 15;
// Always emit at least this often even if driver is stationary
const HEARTBEAT_MS = 4_000;
// REST-persist to DB (late-joining riders need last-known position)
const REST_SYNC_MS = 30_000;

let _routeId      = null;
let _lastRestSync = 0;
// Track the last emitted coordinates to compute movement
let _lastEmitLat  = null;
let _lastEmitLng  = null;
let _lastEmitMs   = 0;

// Haversine distance in metres between two GPS points
function haversineM(lat1, lng1, lat2, lng2) {
  const R   = 6_371_000;
  const toR = d => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function startTracking(routeId) {
  _routeId      = routeId;
  _lastRestSync = 0;
  _lastEmitLat  = null;
  _lastEmitLng  = null;
  _lastEmitMs   = 0;

  // Connect socket and join the driver-side route room
  const socket = await connectSocket();
  socket.emit('join-route', { routeId });

  // Re-join room automatically on reconnect (network drop recovery)
  socket.off('connect');
  socket.on('connect', () => {
    if (_routeId) socket.emit('join-route', { routeId: _routeId });
  });

  // Module-level callback — survives component unmount / screen navigation
  setLocationCallback(location => {
    const now        = Date.now();
    const routeIdNow = _routeId;
    if (!routeIdNow) return;

    const { latitude, longitude } = location;

    // ── Socket: emit only on significant movement or heartbeat ─────────────
    const movedM =
      _lastEmitLat != null
        ? haversineM(_lastEmitLat, _lastEmitLng, latitude, longitude)
        : Infinity; // first update always emits

    const elapsedSinceEmit = now - _lastEmitMs;
    const shouldEmit =
      movedM >= DISTANCE_THRESHOLD_M || elapsedSinceEmit >= HEARTBEAT_MS;

    if (shouldEmit) {
      const s = getSocket();
      if (s?.connected) {
        s.emit('driver-location', {
          routeId:   routeIdNow,
          latitude,
          longitude,
          accuracy:  location.accuracy,
          speed:     location.speed,
          heading:   location.heading,
          timestamp: location.timestamp,
        });
        _lastEmitLat = latitude;
        _lastEmitLng = longitude;
        _lastEmitMs  = now;
      }
    }

    // ── REST: persist to DB for late-joining riders ────────────────────────
    if (now - _lastRestSync >= REST_SYNC_MS) {
      _lastRestSync = now;
      api.post('/location/update', {
        routeId:   routeIdNow,
        latitude,
        longitude,
        accuracy:  location.accuracy,
        speed:     location.speed,
        heading:   location.heading,
        timestamp: location.timestamp,
      }).catch(() => {});
    }
  });

  setErrorCallback(err => {
    console.warn('[trackingService] GPS error:', err.message);
  });
}

export function stopTracking(routeId) {
  const socket = getSocket();
  if (socket) {
    socket.off('connect');
    if (routeId) socket.emit('leave-route', { routeId });
  }
  _routeId      = null;
  _lastRestSync = 0;
  _lastEmitLat  = null;
  _lastEmitLng  = null;
  _lastEmitMs   = 0;
  setLocationCallback(null);
  setErrorCallback(null);
}

export function isTracking() {
  return _routeId !== null;
}
