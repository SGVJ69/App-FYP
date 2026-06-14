
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let ttsAudioCtx: AudioContext | null = null;

export async function playTTS(base64: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!ttsAudioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        ttsAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      }
      if (ttsAudioCtx.state === 'suspended') {
        ttsAudioCtx.resume();
      }
      const data = decode(base64);
      // Gemini 3.1 Flash TTS is 24000Hz mono PCM
      decodeAudioData(data, ttsAudioCtx, 24000, 1).then((buffer) => {
        const source = ttsAudioCtx!.createBufferSource();
        source.buffer = buffer;
        source.connect(ttsAudioCtx!.destination);
        source.onended = () => {
          resolve();
        };
        source.start(0);
      }).catch((err) => {
        console.error("Decoding audio for playTTS failed:", err);
        resolve();
      });
    } catch (error) {
      console.error("Error playing TTS audio:", error);
      resolve();
    }
  });
}

export function playOfflineVoice(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    try {
      // Cancel any active speech to avoid queuing delays
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Match Malay or Indonesian voices which vocalize Austronesian phonetics matching Kadazan perfectly
      const targetVoice = voices.find(v => 
        v.lang.toLowerCase().replace(/[-_]/g, '').startsWith('ms') ||
        v.lang.toLowerCase().replace(/[-_]/g, '').startsWith('id') ||
        v.name.toLowerCase().includes('indonesia') ||
        v.name.toLowerCase().includes('malay')
      );
      
      if (targetVoice) {
        utterance.voice = targetVoice;
        utterance.lang = targetVoice.lang;
      } else {
        utterance.lang = 'ms-MY';
      }
      
      utterance.pitch = 1.07; // subtle pitch increase for general tone definition
      utterance.rate = 0.85;  // slower speed so terms are highly discernible for beginners
      
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = (e) => {
        console.warn("speechSynthesis utterance error:", e);
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Offline speech generation failed:", err);
      resolve();
    }
  });
}

