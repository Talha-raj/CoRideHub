/**
 * src/services/socketService.js
 *
 * Module-level Socket.IO singleton.
 * One connection is shared across the entire app.
 *
 * Public API
 * ──────────
 *   connectSocket()   → Promise<Socket>  — connect (or return existing)
 *   getSocket()       → Socket | null
 *   disconnectSocket() → void
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { io } from 'socket.io-client';

const DEV_HOST  = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const SOCKET_URL = `http://${DEV_HOST}:5000`;

let _socket = null;

async function readAuthToken() {
  try {
    const raw = await AsyncStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.token ?? null;
  } catch {
    return null;
  }
}

export async function connectSocket() {
  if (_socket?.connected) return _socket;

  // Tear down any stale/disconnected instance before creating a new one
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }

  const token = await readAuthToken();

  _socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  return _socket;
}

export function getSocket() {
  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
}
