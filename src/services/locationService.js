/**
 * src/services/locationService.js
 *
 * Bridge to the native LocationModule (Android foreground service /
 * iOS CLLocationManager with background-location enabled).
 *
 * Key design: event listeners are attached once when tracking STARTS
 * and detached only when tracking STOPS — they are NOT tied to any
 * component's lifecycle, so location updates continue even when the
 * driver navigates away from the "My Routes" screen.
 *
 * Public API
 * ──────────
 *   startLocationSharing()    → Promise<boolean>
 *   stopLocationSharing()     → Promise<boolean>
 *   isLocationSharingActive() → boolean
 *   getCurrentLocation()      → Promise<LocationPayload>
 *   setLocationCallback(fn)   → void
 *   setErrorCallback(fn)      → void
 *   setupLocationListeners()  → () => void  (no-op, kept for compat)
 */

import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { requestLocationPermission } from '../utils/permissions/permissions';

const { LocationModule } = NativeModules;

// iOS uses NativeEventEmitter so startObserving/stopObserving fire correctly.
// Android uses DeviceEventEmitter (RCTDeviceEventEmitter under the hood).
const emitter = Platform.OS === 'ios' && LocationModule
  ? new NativeEventEmitter(LocationModule)
  : DeviceEventEmitter;

// ── Module-level state ─────────────────────────────────────────────────────────

let _isTracking       = false;
let _locationCallback = null;
let _errorCallback    = null;
let _locationSub      = null;
let _errorSub         = null;

// ── Internal helpers ───────────────────────────────────────────────────────────

function attachListeners() {
  if (_locationSub) return; // already attached — idempotent
  _locationSub = emitter.addListener('onLocationUpdate', loc => {
    _locationCallback?.(loc);
  });
  _errorSub = emitter.addListener('onLocationError', err => {
    _errorCallback?.(err);
  });
}

function detachListeners() {
  _locationSub?.remove();
  _errorSub?.remove();
  _locationSub = null;
  _errorSub    = null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function startLocationSharing() {
  const granted = await requestLocationPermission();
  if (!granted) return false;

  attachListeners(); // attach BEFORE starting so no early events are missed
  LocationModule.startTracking();
  _isTracking = true;
  return true;
}

export async function stopLocationSharing() {
  LocationModule?.stopTracking();
  detachListeners();
  _isTracking = false;
  return true;
}

export function isLocationSharingActive() {
  return _isTracking;
}

export function getCurrentLocation() {
  return LocationModule.getCurrentLocation();
}

export function setLocationCallback(callback) {
  _locationCallback = callback;
}

export function setErrorCallback(callback) {
  _errorCallback = callback;
}

// No-op — listeners are now managed internally; kept for API compatibility.
export function setupLocationListeners() {
  return () => {};
}

// ── Native helpers (background / kill-state support) ──────────────────────────

/**
 * Persist routeId + auth token + server URL to native storage
 * (SharedPreferences on Android, UserDefaults on iOS).
 * The native foreground service reads these to keep posting location
 * via HTTP even when the JS thread is suspended or the app is killed.
 */
export function saveTrackingInfo(routeId, token, serverUrl) {
  LocationModule?.saveTrackingInfo?.(routeId, token, serverUrl);
}

export function clearTrackingInfo() {
  LocationModule?.clearTrackingInfo?.();
}
