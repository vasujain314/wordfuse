import { requireOptionalNativeModule } from 'expo';
import { AppRegistry, Platform } from 'react-native';

/**
 * Keeps a multiplayer room connected while the Android app is in the background (see
 * android/.../RoomKeepAliveService.kt). On iOS and the web there is no such mechanism, so
 * every function here is a no-op and rooms rely on reconnecting when the app comes back.
 */
const Native = Platform.OS === 'android' ? requireOptionalNativeModule('RoomKeepAlive') : null;

export const KEEP_ALIVE_TASK = 'WordFuseRoomKeepAlive';

// The service runs this task for as long as the player is in a room; React Native keeps
// JavaScript timers running while it is active. Resolving it ends the task.
let finishTask = null;
if (Native) {
  AppRegistry.registerHeadlessTask(
    KEEP_ALIVE_TASK,
    () => () =>
      new Promise((resolve) => {
        finishTask = resolve;
      }),
  );
}

export const isKeepAliveSupported = () => Native !== null;

/** Whether the service is running (false on iOS/web). */
export function isRoomKeepAliveRunning() {
  try {
    return Boolean(Native?.isRunning());
  } catch {
    return false;
  }
}

/** Starts the service (call while the app is in the foreground, e.g. on entering a room). */
export function startRoomKeepAlive({ title, text }) {
  if (!Native) return false;
  try {
    return Native.start(title, text);
  } catch {
    return false;
  }
}

/** Ends the background task and stops the service. Safe to call when it isn't running. */
export function stopRoomKeepAlive() {
  finishTask?.();
  finishTask = null;
  if (!Native) return;
  try {
    Native.stop();
  } catch {
    // Already stopped.
  }
}

/** Tells the service the app went to the background (starts its 10-minute limit) or came back. */
export function setRoomKeepAliveInBackground(inBackground) {
  try {
    Native?.setInBackground(inBackground);
  } catch {
    // Not running.
  }
}

/**
 * Listens for 'onTaskRemoved' (the app was swiped away: leave the room) or 'onExpired'
 * (stopped after too long in the background). Returns a subscription with remove().
 */
export function addRoomKeepAliveListener(eventName, listener) {
  return Native?.addListener(eventName, listener) ?? { remove() {} };
}
