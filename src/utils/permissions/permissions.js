/**
 * src/utils/permissions/permissions.js
 *
 * Single source of truth for all permission handling.
 * No permission logic should exist anywhere else in the app.
 *
 * Public API
 * ──────────
 *   requestLocationPermission()  → Promise<boolean>
 *   checkLocationPermission()    → Promise<boolean>
 */

import { Platform } from 'react-native';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

// ── Permission identifiers ─────────────────────────────────────────────────────

const PERM = {
  IOS_WHEN_IN_USE:      PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  IOS_ALWAYS:           PERMISSIONS.IOS.LOCATION_ALWAYS,
  ANDROID_FINE:         PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  ANDROID_BACKGROUND:   PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function isGranted(result) {
  return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
}

/**
 * Request a permission and, if DENIED on the first ask, ask once more.
 * Returns the final result string.
 */
async function requestWithRetry(permission) {
  const first = await request(permission);
  if (isGranted(first)) return RESULTS.GRANTED;
  if (first === RESULTS.DENIED) {
    const second = await request(permission);
    return isGranted(second) ? RESULTS.GRANTED : second;
  }
  return first; // BLOCKED | UNAVAILABLE
}

/**
 * Open system settings and re-check the permission on return.
 * Returns true if the user enabled it.
 */
async function handleBlocked(permission) {
  await openSettings();
  const result = await check(permission);
  return isGranted(result);
}

// ── iOS flow ───────────────────────────────────────────────────────────────────

async function requestIosLocation() {
  // Step 1 — WhenInUse (foreground)
  const whenInUse = await requestWithRetry(PERM.IOS_WHEN_IN_USE);
  if (whenInUse === RESULTS.BLOCKED) return handleBlocked(PERM.IOS_WHEN_IN_USE);
  if (!isGranted(whenInUse)) return false;

  // Step 2 — Always (background). iOS shows this as a separate prompt.
  const always = await requestWithRetry(PERM.IOS_ALWAYS);
  if (always === RESULTS.BLOCKED) return handleBlocked(PERM.IOS_ALWAYS);
  return isGranted(always);
}

async function checkIosLocation() {
  const always = await check(PERM.IOS_ALWAYS);
  if (isGranted(always)) return true;
  return isGranted(await check(PERM.IOS_WHEN_IN_USE));
}

// ── Android flow ──────────────────────────────────────────────────────────────

async function requestAndroidLocation() {
  // Step 1 — Fine location
  const fine = await requestWithRetry(PERM.ANDROID_FINE);
  if (fine === RESULTS.BLOCKED) return handleBlocked(PERM.ANDROID_FINE);
  if (!isGranted(fine)) return false;

  // Step 2 — Background location (Android 10 / API 29+).
  // On Android 11+, the OS shows a settings page; on Android 10 a dialog.
  if (Platform.Version < 29) return true;

  const bg = await requestWithRetry(PERM.ANDROID_BACKGROUND);
  if (bg === RESULTS.BLOCKED) return handleBlocked(PERM.ANDROID_BACKGROUND);
  return isGranted(bg);
}

async function checkAndroidLocation() {
  if (!isGranted(await check(PERM.ANDROID_FINE))) return false;
  if (Platform.Version < 29) return true;
  return isGranted(await check(PERM.ANDROID_BACKGROUND));
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Request foreground + background location permission.
 *
 * Flow:
 *   GRANTED            → return true
 *   DENIED (first ask) → ask again → true / false
 *   BLOCKED            → open Settings → re-check → true / false
 *
 * @returns {Promise<boolean>}
 */
export async function requestLocationPermission() {
  return Platform.OS === 'ios'
    ? requestIosLocation()
    : requestAndroidLocation();
}

/**
 * Non-destructive check of current location permission state.
 * Does NOT trigger any system dialog.
 *
 * @returns {Promise<boolean>}
 */
export async function checkLocationPermission() {
  return Platform.OS === 'ios'
    ? checkIosLocation()
    : checkAndroidLocation();
}
