let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;

/**
 * Initialize audio context and load notification sound
 */
async function initAudio(): Promise<void> {
  if (audioContext && audioBuffer) {
    return; // Already initialized
  }

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Try to load the notification sound file
    try {
      const response = await fetch('/sounds/notification-ding.mp3');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return; // Successfully loaded file
      }
    } catch (fetchError) {
      // File doesn't exist or fetch failed, use fallback
    }
    
    // Fallback: create a simple beep tone
    audioBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
    const data = audioBuffer.getChannelData(0);
    for (let i = 0; i < audioBuffer.length; i++) {
      data[i] = Math.sin(2 * Math.PI * 800 * i / audioContext.sampleRate) * 0.3;
    }
  } catch (error) {
    // Silently fail - audio notifications just won't work
    console.warn('Failed to initialize audio notifications:', error);
  }
}

/**
 * Play notification sound
 */
export async function playNotificationSound(): Promise<void> {
  try {
    await initAudio();
    
    if (!audioContext || !audioBuffer) {
      return;
    }
    
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = audioBuffer;
    gainNode.gain.value = 0.3; // Volume
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start(0);
    
    // Clean up after playback
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}
