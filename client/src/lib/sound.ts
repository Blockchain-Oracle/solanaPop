/**
 * Sound utility functions for consistent audio feedback
 */

// Cached audio instances to prevent multiple loads
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a sound effect from the public sounds directory
 * @param name Sound file name (without path or extension)
 * @returns Promise that resolves when sound starts playing, or rejects on error
 */
export const playSound = async (name: string): Promise<void> => {
  try {
    // Use cached audio instance if available
    if (!audioCache[name]) {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audioCache[name] = audio;
    }
    
    // Reset the audio to beginning in case it was already played
    audioCache[name].currentTime = 0;
    
    // Play the sound
    return audioCache[name].play();
  } catch (error) {
    console.error(`Failed to play sound: ${name}`, error);
    // Don't throw error - sound failure shouldn't break the app
  }
};

/**
 * Play the success beep sound
 */
export const playSuccessBeep = () => playSound('success-beep');

/**
 * Play the error sound
 */
export const playErrorSound = () => playSound('error');

/**
 * Preload sounds for instant playback
 * @param sounds Array of sound names to preload
 */
export const preloadSounds = (sounds: string[]) => {
  sounds.forEach(name => {
    if (!audioCache[name]) {
      audioCache[name] = new Audio(`/sounds/${name}.mp3`);
      // Start loading the sound file
      audioCache[name].load();
    }
  });
};

// Preload common sounds when this module is imported
preloadSounds(['success-beep']); 