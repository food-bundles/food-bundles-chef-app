import * as Speech from 'expo-speech';

let voiceCache: Speech.Voice[] | null = null;

async function voices(): Promise<Speech.Voice[]> {
  if (voiceCache) return voiceCache;
  try {
    voiceCache = await Speech.getAvailableVoicesAsync();
  } catch {
    voiceCache = [];
  }
  return voiceCache;
}

/** Whether the device has a text-to-speech voice for this app language. */
export async function canSpeak(language: string): Promise<boolean> {
  if (language === 'rw') return false; // no reliable device TTS for Kinyarwanda — stay text-only
  const list = await voices();
  return list.some((v) => v.language.toLowerCase().startsWith(language));
}

/** Read a short assistant reply aloud (only when the chef enabled spoken replies). */
export async function speakReply(text: string, language: string): Promise<void> {
  if (!text.trim() || text.length > 400) return;
  if (!(await canSpeak(language))) return;
  Speech.stop();
  Speech.speak(text, { language, rate: 1.0 });
}

export function stopSpeaking(): void {
  Speech.stop();
}
