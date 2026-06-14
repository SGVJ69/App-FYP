
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Packages raw 16-bit PCM (24000Hz mono) into a standard RIFF/WAV Blob
export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
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

  return new Blob([wavBytes], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function primeAudioContext(): void {
  // Legacy / No-op for backward compatibility, since HTML5 Audio element handles it natively now!
  console.log("Audio container primed natively.");
}

export async function playTTS(base64: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const pcmBytes = decode(base64);
      const wavBlob = pcmToWav(pcmBytes, 24000);
      const objectUrl = URL.createObjectURL(wavBlob);
      
      const audio = new Audio();
      audio.src = objectUrl;
      
      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error("HTML5 WAV Audio playback error:", e);
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("HTML5 WAV Audio playback started successfully in WebView.");
          })
          .catch((err) => {
            console.warn("HTML5 audio play was prevented, trying muted trigger or resolving directly:", err);
            // On some restrictively configured WebViews, user gestures are strictly cleared. 
            // In such situations we still want to finish gracefully.
            resolve();
          });
      }
    } catch (error) {
      console.error("Error creating or playing WAV audio:", error);
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

