
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Packages raw 16-bit PCM (24000Hz mono) into a standard RIFF/WAV Uint8Array
export function pcmToWavBytes(pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + pcmData.length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 = PCM) */
  view.setUint16(20, 1, true);
  /* channel count (1 = Mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, pcmData.length, true);

  // Copy header and PCM data
  const headerBytes = new Uint8Array(buffer, 0, 44);
  const wavBytes = new Uint8Array(44 + pcmData.length);
  wavBytes.set(headerBytes, 0);
  wavBytes.set(pcmData, 44);

  return wavBytes;
}

// Packages raw 16-bit PCM (24000Hz mono) into a standard RIFF/WAV Blob
export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const wavBytes = pcmToWavBytes(pcmData, sampleRate);
  return new Blob([wavBytes], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): AudioBuffer {
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

export function primeAudioContext(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!ttsAudioCtx) {
      ttsAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      console.log("AudioContext initialized via gesture priming.");
    }
    if (ttsAudioCtx && ttsAudioCtx.state === 'suspended') {
      ttsAudioCtx.resume()
        .then(() => console.log("AudioContext successfully resumed via priming."))
        .catch((err) => console.warn("Could not resume AudioContext:", err));
    }
  } catch (err) {
    console.warn("Failed to prime AudioContext:", err);
  }
}

export async function playTTS(base64: string): Promise<void> {
  return new Promise((resolve) => {
    let triedWebAudioFallback = false;

    const triggerWebAudioFallback = async () => {
      if (triedWebAudioFallback) {
        resolve();
        return;
      }
      triedWebAudioFallback = true;
      console.log("Triggering Web Audio API decoding fallback...");
      try {
        primeAudioContext();
        if (!ttsAudioCtx) {
          throw new Error("No AudioContext available");
        }
        const pcmBytes = decode(base64);
        const buffer = decodeAudioData(pcmBytes, ttsAudioCtx, 24000, 1);
        const source = ttsAudioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(ttsAudioCtx.destination);
        source.onended = () => {
          resolve();
        };
        source.start(0);
      } catch (err) {
        console.error("Web Audio API decoding fallback failed as well:", err);
        resolve();
      }
    };

    try {
      // 1. Generate Wave Bytes
      const pcmBytes = decode(base64);
      const wavBytes = pcmToWavBytes(pcmBytes, 24000);
      
      // 2. Conver to Base64 Data URI instead of blob: URL (which is highly restricted in Android WebViews)
      const base64Wav = uint8ArrayToBase64(wavBytes);
      const dataUri = "data:audio/wav;base64," + base64Wav;
      
      const audio = new Audio();
      audio.src = dataUri;
      
      audio.onended = () => {
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error("HTML5 WAV base64 Audio playback error, trying Web Audio API context fallback:", e);
        triggerWebAudioFallback();
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("HTML5 WAV base64 Audio playback started successfully in WebView.");
          })
          .catch((err) => {
            console.warn("HTML5 base64 audio play was prevented/blocked, trying Web Audio API context fallback:", err);
            triggerWebAudioFallback();
          });
      }
    } catch (error) {
      console.error("Error creating or playing base64 WAV audio:", error);
      triggerWebAudioFallback();
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

