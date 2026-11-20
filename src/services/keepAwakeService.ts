import { Platform } from 'react-native';

let keepAwakeModule: any = null;
try {
  keepAwakeModule = require('expo-keep-awake');
} catch {
  // Graceful fallback if expo-keep-awake is not bundled
}

let webWakeLock: any = null;

export const keepAwakeService = {
  activate: async (): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          try {
            webWakeLock = await (navigator as any).wakeLock.request('screen');
          } catch {
            // Wake lock request rejected or permission denied
          }
        }
      } else if (keepAwakeModule?.activateKeepAwakeAsync) {
        await keepAwakeModule.activateKeepAwakeAsync('solvacube_playback');
      }
    } catch {
      // Suppress any errors
    }
  },

  deactivate: async (): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (webWakeLock && typeof webWakeLock.release === 'function') {
          await webWakeLock.release();
          webWakeLock = null;
        }
      } else if (keepAwakeModule?.deactivateKeepAwake) {
        keepAwakeModule.deactivateKeepAwake('solvacube_playback');
      }
    } catch {
      // Suppress any errors
    }
  },
};

